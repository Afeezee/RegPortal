import type { ParsedCourse, SemesterOffering } from "@/lib/handbook/types";

export type ConstraintIssueKind =
  | "missing_prerequisite"
  | "duplicate_course"
  | "already_completed"
  | "credit_underload"
  | "credit_overload"
  | "missing_required_elective_choice"
  | "gst_progress";

export type ConstraintIssueSeverity = "warning" | "error";

export type ConstraintIssue = {
  kind: ConstraintIssueKind;
  severity: ConstraintIssueSeverity;
  message: string;
  courseCode?: string;
};

export type RegistrationEvaluation = {
  totalUnits: number;
  expectedUnits: number | null;
  issues: ConstraintIssue[];
  selectableCourseCodes: string[];
};

export type RegistrationSelectionInput = {
  offering: SemesterOffering;
  selectedCourseCodes: string[];
  completedCourseCodes: string[];
  departmentMinUnits?: number | null;
  departmentMaxUnits?: number | null;
  externalCatalogue?: ParsedCourse[];
  outstandingCourseCodes?: string[];
};

export function evaluateRegistrationSelection({
  offering,
  selectedCourseCodes,
  completedCourseCodes,
  departmentMinUnits,
  departmentMaxUnits,
  externalCatalogue = [],
  outstandingCourseCodes = [],
}: RegistrationSelectionInput): RegistrationEvaluation {
  const normalizedCompleted = new Set(completedCourseCodes.map((code) => code.toUpperCase()));
  const normalizedSelected = selectedCourseCodes.map((code) => code.toUpperCase());
  const selectedSet = new Set(normalizedSelected);
  const outstandingSet = new Set(outstandingCourseCodes.map((code) => code.toUpperCase()));

  const allSelectableCourses = [
    ...offering.courses,
    ...offering.courseGroups.flatMap((group) => group.options),
    ...externalCatalogue,
  ];
  const courseByCode = new Map<string, ParsedCourse>();
  for (const course of allSelectableCourses) {
    const key = course.code.toUpperCase();
    if (!courseByCode.has(key)) courseByCode.set(key, course);
  }

  const issues: ConstraintIssue[] = [];
  const seenSelected = new Set<string>();

  for (const code of normalizedSelected) {
    if (seenSelected.has(code)) {
      issues.push({
        kind: "duplicate_course",
        severity: "error",
        courseCode: code,
        message: `${code} was selected more than once.`,
      });
      continue;
    }
    seenSelected.add(code);

    if (normalizedCompleted.has(code)) {
      issues.push({
        kind: "already_completed",
        severity: "error",
        courseCode: code,
        message: `${code} was already passed in an earlier semester and does not need to be taken again.`,
      });
    }

    const course = courseByCode.get(code);
    if (!course) {
      continue;
    }

    for (const prerequisite of course.prerequisites) {
      if (!normalizedCompleted.has(prerequisite.toUpperCase())) {
        issues.push({
          kind: "missing_prerequisite",
          severity: "error",
          courseCode: code,
          message: `${code} requires ${prerequisite} to have been passed first.`,
        });
      }
    }
  }

  for (const group of offering.courseGroups) {
    const selectedInGroup = group.options.filter((course) => selectedSet.has(course.code.toUpperCase()));

    if (selectedInGroup.length < group.pickCount) {
      issues.push({
        kind: "missing_required_elective_choice",
        severity: "warning",
        message: `Select ${group.pickCount} course${group.pickCount > 1 ? "s" : ""} from ${group.label}.`,
      });
    }

    if (selectedInGroup.length > group.pickCount) {
      issues.push({
        kind: "duplicate_course",
        severity: "error",
        message: `Only ${group.pickCount} course${group.pickCount > 1 ? "s are" : " is"} allowed from ${group.label}.`,
      });
    }
  }

  const totalUnits = normalizedSelected.reduce((sum, code) => {
    const course = courseByCode.get(code);
    if (!course || course.isZeroUnit) {
      return sum;
    }
    return sum + course.creditUnits;
  }, 0);

  if (typeof departmentMinUnits === "number" && totalUnits < departmentMinUnits) {
    issues.push({
      kind: "credit_underload",
      severity: "error",
      message: `Selected load is ${totalUnits} units, below your department's required minimum of ${departmentMinUnits}.`,
    });
  } else if (offering.expectedUnits && totalUnits < offering.expectedUnits) {
    issues.push({
      kind: "credit_underload",
      severity: "warning",
      message: `Selected load is ${totalUnits} units against an expected ${offering.expectedUnits} units.`,
    });
  }

  if (typeof departmentMaxUnits === "number" && totalUnits > departmentMaxUnits) {
    issues.push({
      kind: "credit_overload",
      severity: "error",
      message: `Selected load is ${totalUnits} units, above your department's maximum of ${departmentMaxUnits}.`,
    });
  } else if (offering.expectedUnits && totalUnits > offering.expectedUnits) {
    issues.push({
      kind: "credit_overload",
      severity: "warning",
      message: `Selected load is ${totalUnits} units against an expected ${offering.expectedUnits} units.`,
    });
  }

  const outstandingNotYetAdded = [...outstandingSet].filter((code) => !selectedSet.has(code));
  if (outstandingNotYetAdded.length) {
    issues.push({
      kind: "gst_progress",
      severity: "warning",
      message: `You still have outstanding course${outstandingNotYetAdded.length > 1 ? "s" : ""} to retake: ${outstandingNotYetAdded.join(", ")}. Add them below.`,
    });
  }

  const selectedGstCourses = normalizedSelected.filter((code) => code.startsWith("GST") || code.startsWith("GNS"));
  const completedGstCourses = completedCourseCodes.filter(
    (code) => code.startsWith("GST") || code.startsWith("GNS"),
  );

  if (!selectedGstCourses.length && completedGstCourses.length < 4) {
    issues.push({
      kind: "gst_progress",
      severity: "warning",
      message: "No GST course is in this selection even though the record suggests GST progression is still in progress.",
    });
  }

  return {
    totalUnits,
    expectedUnits: offering.expectedUnits ?? null,
    issues,
    selectableCourseCodes: [...courseByCode.keys()],
  };
}
