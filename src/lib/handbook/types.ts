export type HandbookCourseType = "core" | "elective" | "gst";

export type HandbookIssueSeverity = "info" | "warning" | "error";

export type HandbookIssue = {
  severity: HandbookIssueSeverity;
  department: string;
  level?: number;
  semesterLabel?: string;
  message: string;
  rawLine?: string;
};

export type ParsedCourse = {
  code: string;
  title: string;
  creditUnits: number;
  courseType: HandbookCourseType;
  prerequisites: string[];
  isZeroUnit: boolean;
  note?: string;
  courseCategory?: string;
};

export type ParsedCourseGroup = {
  label: string;
  pickCount: number;
  sharedUnits?: number;
  options: ParsedCourse[];
  note?: string;
};

export type SemesterOffering = {
  level: number;
  semester: 1 | 2;
  semesterLabel: string;
  expectedUnits?: number;
  courses: ParsedCourse[];
  courseGroups: ParsedCourseGroup[];
  note?: string;
};

export type DepartmentSeed = {
  name: string;
  college: string;
  registrationMinUnits?: number;
  registrationMaxUnits?: number;
  offerings: SemesterOffering[];
};

export type HandbookSeedData = {
  generatedAt: string;
  colleges: Array<{
    name: string;
    departments: DepartmentSeed[];
  }>;
  issues: HandbookIssue[];
};
