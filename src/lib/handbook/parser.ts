import { readFileSync } from "node:fs";

import type {
  DepartmentSeed,
  HandbookIssue,
  HandbookSeedData,
  ParsedCourse,
  ParsedCourseGroup,
  SemesterOffering,
} from "@/lib/handbook/types";

const COLLEGE_MAP: Record<string, string[]> = {
  "College of Management and Social Sciences": [
    "Accounting",
    "Banking and Finance",
    "Business Administration",
    "Economics",
    "International Relations",
    "Political Science",
    "Public Administration",
  ],
  "Ramon Adedoyin College of Natural and Applied Sciences": [
    "Biochemistry",
    "Computer Science",
    "Industrial Chemistry",
    "Microbiology",
    "Physics with Electronics",
  ],
  "Ramon Adedoyin College of Engineering and Technology": [
    "Computer Engineering",
    "Electrical/Electronics Engineering",
    "Mechanical Engineering",
  ],
  "Oba Sijuwade College of Environmental Design and Management": [
    "Architecture",
    "Estate Management",
    "Quantity Surveying",
  ],
  "College of Health Sciences": ["Nursing Sciences"],
  "College of Law": ["Law"],
  "College of Communication and Media Arts": ["Mass Communication"],
};

const departmentToCollege = new Map<string, string>(
  Object.entries(COLLEGE_MAP).flatMap(([college, departments]) =>
    departments.map((department) => [department, college] as const),
  ),
);

function normalizeCollegeHeading(line: string) {
  return line
    .replace(/^##\s+/, "")
    .replace(/RACOET/g, "Ramon Adedoyin College of Engineering and Technology")
    .replace(/RACONAS/g, "Ramon Adedoyin College of Natural and Applied Sciences")
    .replace(/COCMS/g, "College of Communication and Media Arts")
    .replace(/COL$/g, "College of Law")
    .trim();
}

function parseLevelSemesterHeader(rawLine: string) {
  const headerMatch = rawLine.match(/^\*?(\d{3}) Level ([A-Za-z ]+?) Semester(?: \(([^)]+)\))?:\*?\s*(.*)$/);

  if (!headerMatch) {
    return null;
  }

  const [, levelValue, semesterLabelRaw, unitsLabel, remainder] = headerMatch;
  const semesterLabel = semesterLabelRaw.trim();
  const normalizedSemester = /first|harmattan/i.test(semesterLabel)
    ? 1
    : /second|rain/i.test(semesterLabel)
      ? 2
      : null;

  if (!normalizedSemester) {
    return null;
  }

  const totalUnits = unitsLabel?.match(/\d+/)?.[0];

  return {
    level: Number(levelValue),
    semester: normalizedSemester as 1 | 2,
    semesterLabel,
    expectedUnits: totalUnits ? Number(totalUnits) : undefined,
    remainder,
  };
}

function splitTopLevelCommaSeparated(input: string) {
  const segments: string[] = [];
  let buffer = "";
  let depth = 0;

  for (const character of input) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(depth - 1, 0);

    if (character === "," && depth === 0) {
      if (buffer.trim()) {
        segments.push(buffer.trim());
      }
      buffer = "";
      continue;
    }

    buffer += character;
  }

  if (buffer.trim()) {
    segments.push(buffer.trim());
  }

  return segments;
}

function extractPrerequisites(fragment: string) {
  const matches = [...fragment.matchAll(/Pre-req\s+([A-Z]{2,4}\s?\d{3}[A-Z]?)/gi)];
  return matches.map((match) => match[1].replace(/\s+/g, " ").trim());
}

function inferCourseType(code: string, fragment: string): "core" | "elective" | "gst" {
  if (code.startsWith("GST") || code.startsWith("GNS")) {
    return "gst";
  }

  if (/elective/i.test(fragment)) {
    return "elective";
  }

  return "core";
}

function parseCourseFragment(fragment: string, issues: HandbookIssue[], department: string): ParsedCourse | null {
  const codeMatch = fragment.match(/^([A-Z]{2,4}\s?\d{3}[A-Z]?\??|LAW\s?591|ENG\s?00\d|COM\s?00\d|GNS\s?\d{3}|CAL\s?\d{3}|DSL\s?\d{3})\s+(.+)$/i);

  if (!codeMatch) {
    issues.push({
      severity: "warning",
      department,
      message: "Unable to parse course fragment",
      rawLine: fragment,
    });
    return null;
  }

  const [, rawCode, details] = codeMatch;
  const code = rawCode.replace(/\s+/g, " ").trim();
  const prerequisites = extractPrerequisites(details);
  const unitMatches = [...details.matchAll(/\((?:[^()]*)?(\d)(?:\s*units?)?\)/gi)];
  const explicitUnitMatch = details.match(/\((\d)\)$/);
  const inferredUnits = explicitUnitMatch
    ? Number(explicitUnitMatch[1])
    : unitMatches.length > 0
      ? Number(unitMatches[unitMatches.length - 1][1])
      : /(\(C\)|\(R\)|\?)/i.test(details)
        ? 2
        : null;

  if (inferredUnits === null) {
    issues.push({
      severity: "warning",
      department,
      message: `Missing unit count for ${code}; defaulted to 2 for supervisor review.`,
      rawLine: fragment,
    });
  }

  if (/[?]/.test(fragment) || /\(C\)|\(R\)/.test(fragment)) {
    issues.push({
      severity: "warning",
      department,
      message: `Course ${code} contains OCR or tag artefacts and should be supervisor-reviewed.`,
      rawLine: fragment,
    });
  }

  const title = details
    .replace(/\([^)]*Pre-req[^)]*\)/gi, "")
    .replace(/\((Elective|C|R)[^)]*\)/gi, "")
    .replace(/\((\d|\d units?)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[;,]$/, "");

  return {
    code,
    title,
    creditUnits: inferredUnits ?? 2,
    courseType: inferCourseType(code, fragment),
    prerequisites,
    isZeroUnit: (inferredUnits ?? 2) === 0,
    note: /\(C\)|\(R\)|\?/.test(fragment) ? "Source contains OCR/tag ambiguity." : undefined,
    courseCategory: code.startsWith("CIL")
      ? "Commercial and Industrial Law"
      : code.startsWith("JIL")
        ? "Jurisprudence and International Law"
        : code.startsWith("PPL")
          ? "Private and Property Law"
          : code.startsWith("PBL") || code.startsWith("PUL")
            ? "Public Law"
            : undefined,
  };
}

function parseElectiveGroup(
  label: string,
  body: string,
  issues: HandbookIssue[],
  department: string,
): ParsedCourseGroup | null {
  const pickCountMatch = label.match(/one|two|three|four/i);
  const pickCount = pickCountMatch
    ? { one: 1, two: 2, three: 3, four: 4 }[pickCountMatch[0].toLowerCase() as "one" | "two" | "three" | "four"]
    : 1;

  const sharedUnits = body.match(/\((\d)\)\s*$/)?.[1];
  const normalizedBody = body
    .replace(/^plus\s+/i, "")
    .replace(/^one elective from\s+/i, "")
    .replace(/^electives?:\s*/i, "")
    .replace(/^students required to take one:\s*/i, "")
    .trim();

  const fragments = splitTopLevelCommaSeparated(normalizedBody.replace(/\s+or\s+/gi, ", "));
  const options = fragments
    .map((fragment) => {
      const maybeCourse = parseCourseFragment(
        sharedUnits && !/\(\d\)/.test(fragment) ? `${fragment} (${sharedUnits})` : fragment,
        issues,
        department,
      );

      if (maybeCourse) {
        maybeCourse.courseType = "elective";
      }

      return maybeCourse;
    })
    .filter((course): course is ParsedCourse => Boolean(course));

  if (!options.length) {
    return null;
  }

  return {
    label,
    pickCount,
    sharedUnits: sharedUnits ? Number(sharedUnits) : undefined,
    options,
  };
}

function parseSemesterRemainder(
  remainder: string,
  department: string,
  issues: HandbookIssue[],
): Pick<SemesterOffering, "courses" | "courseGroups" | "note"> {
  const courseGroups: ParsedCourseGroup[] = [];
  let coreSegment = remainder;

  const explicitElectiveSection = remainder.match(/^(.*?);\s*(Electives?|Any\s+\w+\s+Electives?|plus one elective from)(.*)$/i);
  if (explicitElectiveSection) {
    coreSegment = explicitElectiveSection[1].trim();
    const group = parseElectiveGroup(
      explicitElectiveSection[2].trim(),
      explicitElectiveSection[3].trim(),
      issues,
      department,
    );
    if (group) {
      courseGroups.push(group);
    }
  }

  if (/plus one elective from/i.test(coreSegment)) {
    const [beforeGroup, afterGroup] = coreSegment.split(/plus one elective from/i);
    coreSegment = beforeGroup.trim().replace(/[;,]$/, "");
    const group = parseElectiveGroup("Plus one elective", afterGroup.trim(), issues, department);
    if (group) {
      courseGroups.push(group);
    }
  }

  const courses = splitTopLevelCommaSeparated(coreSegment)
    .map((fragment) => parseCourseFragment(fragment, issues, department))
    .filter((course): course is ParsedCourse => Boolean(course));

  return {
    courses,
    courseGroups,
  };
}

export function parseHandbookMarkdown(markdown: string): HandbookSeedData {
  const issues: HandbookIssue[] = [];
  const departments: DepartmentSeed[] = [];

  const lines = markdown.split(/\r?\n/);
  let currentCollege = "";
  let currentDepartment: DepartmentSeed | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentCollege = normalizeCollegeHeading(line);
      continue;
    }

    const departmentMatch = line.match(/^### Department of (.+)$/);
    if (departmentMatch) {
      const departmentName = departmentMatch[1].trim();
      currentDepartment = {
        name: departmentName,
        college: departmentToCollege.get(departmentName) ?? currentCollege,
        offerings: [],
      };
      departments.push(currentDepartment);
      continue;
    }

    if (!currentDepartment) {
      continue;
    }

    if (/Students are expected to register for a minimum of/i.test(line)) {
      const min = line.match(/minimum of (\d+)/i)?.[1];
      const max = line.match(/maximum of (\d+)/i)?.[1];
      currentDepartment.registrationMinUnits = min ? Number(min) : undefined;
      currentDepartment.registrationMaxUnits = max ? Number(max) : undefined;
      continue;
    }

    const header = parseLevelSemesterHeader(line.trim());
    if (!header) {
      continue;
    }

    const offeringBody = parseSemesterRemainder(header.remainder, currentDepartment.name, issues);
    currentDepartment.offerings.push({
      level: header.level,
      semester: header.semester,
      semesterLabel: header.semesterLabel,
      expectedUnits: header.expectedUnits,
      courses: offeringBody.courses,
      courseGroups: offeringBody.courseGroups,
    });
  }

  for (const department of departments) {
    const seen = new Map<string, string>();
    for (const offering of department.offerings) {
      for (const course of offering.courses) {
        const duplicateKey = `${offering.level}-${offering.semester}-${course.code}`;
        const previousTitle = seen.get(duplicateKey);
        if (previousTitle && previousTitle !== course.title) {
          issues.push({
            severity: "warning",
            department: department.name,
            level: offering.level,
            semesterLabel: offering.semesterLabel,
            message: `Duplicate course code ${course.code} encountered with conflicting titles. Keeping first occurrence during seed review.`,
          });
        }
        if (!previousTitle) {
          seen.set(duplicateKey, course.title);
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    colleges: Object.entries(COLLEGE_MAP).map(([collegeName, collegeDepartments]) => ({
      name: collegeName,
      departments: collegeDepartments
        .map((departmentName) => departments.find((department) => department.name === departmentName))
        .filter((department): department is DepartmentSeed => Boolean(department)),
    })),
    issues,
  };
}

export function parseHandbookFile(filePath: string) {
  return parseHandbookMarkdown(readFileSync(filePath, "utf8"));
}
