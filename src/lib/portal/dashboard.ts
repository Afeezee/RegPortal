import { auth } from "@/auth";
import {
  demoCompletedCourses,
  demoOutstandingCourses,
  demoStudentOfferings,
} from "@/lib/demo/course-data";
import { demoUsers } from "@/lib/demo/demo-data";
import type { ParsedCourse, ParsedCourseGroup, SemesterOffering } from "@/lib/handbook/types";
import { type CatalogueEntry } from "@/lib/portal/catalogue";
import {
  getEffectiveCatalogue,
  listCurriculumOverrides,
  type CurriculumOverride,
} from "@/lib/portal/curriculum-store";
import {
  evaluateRegistrationSelection,
  type RegistrationEvaluation,
} from "@/lib/registration/constraints";
import {
  getRegistrationForStudent,
  getRegistrationWindow,
  listAllRegistrations,
  upsertRegistrationDraft,
  type RegistrationRecord,
  type RegistrationWindow,
} from "@/lib/registration/store";
import { formatLevel, formatSemester } from "@/lib/utils";

export async function getPortalSession() {
  const session = await auth();
  return session;
}

export type StudentDashboardData = {
  student: {
    name: string;
    matricNumber: string;
    currentLevel: number;
    departmentName: string;
  };
  currentOffering: SemesterOffering;
  completedCourses: string[];
  outstandingCourses: string[];
  allSelectableCourses: ParsedCourse[];
  electiveGroups: ParsedCourseGroup[];
  summary: {
    heading: string;
    expectedUnits: number;
    totalCourses: number;
  };
  registration: RegistrationRecord;
  window: RegistrationWindow;
  evaluation: RegistrationEvaluation;
  departmentLimits: { min: number | null; max: number | null };
  carryoverCatalogue: CatalogueEntry[];
  sharedGstCatalogue: CatalogueEntry[];
};

export async function getStudentDashboardData(): Promise<StudentDashboardData | null> {
  const session = await auth();
  if (!session?.user) return null;

  const demoStudent = demoUsers.find((user) => user.loginId === session.user.loginId);
  const currentOffering = demoStudentOfferings[0];

  const student = {
    name: session.user.name ?? demoStudent?.name ?? "Student",
    matricNumber: session.user.matricNumber ?? demoStudent?.matricNumber ?? "",
    currentLevel: session.user.currentLevel ?? demoStudent?.currentLevel ?? currentOffering.level,
    departmentName: demoStudent?.departmentName ?? "Computer Engineering",
  };

  let registration = getRegistrationForStudent(session.user.loginId);
  if (!registration) {
    registration = upsertRegistrationDraft(session.user.loginId, {
      studentName: student.name,
      matricNumber: student.matricNumber,
      departmentName: student.departmentName,
      level: student.currentLevel,
      semester: currentOffering.semester,
      selectedCodes: [],
    });
  }

  const departmentLimits: { min: number | null; max: number | null } = { min: null, max: null };

  const effectiveCatalogue = getEffectiveCatalogue();
  const carryoverCatalogue = effectiveCatalogue.filter(
    (entry) => entry.department === student.departmentName && entry.level < student.currentLevel,
  );
  const sharedGstCatalogue = effectiveCatalogue.filter((entry) => {
    if (!(entry.code.startsWith("GST") || entry.code.startsWith("GNS"))) return false;
    return true;
  });
  const uniqueGstMap = new Map<string, CatalogueEntry>();
  for (const entry of sharedGstCatalogue) {
    if (!uniqueGstMap.has(entry.code.toUpperCase())) uniqueGstMap.set(entry.code.toUpperCase(), entry);
  }
  const dedupedGst = [...uniqueGstMap.values()];
  const externalCatalogue = [...carryoverCatalogue, ...dedupedGst];

  const evaluation = evaluateRegistrationSelection({
    offering: currentOffering,
    selectedCourseCodes: registration.selectedCodes,
    completedCourseCodes: demoCompletedCourses,
    departmentMinUnits: departmentLimits.min,
    departmentMaxUnits: departmentLimits.max,
    externalCatalogue,
    outstandingCourseCodes: demoOutstandingCourses,
  });

  const allSelectableCourses = [
    ...currentOffering.courses,
    ...currentOffering.courseGroups.flatMap((group) => group.options),
  ];

  return {
    student,
    currentOffering,
    completedCourses: demoCompletedCourses,
    outstandingCourses: demoOutstandingCourses,
    allSelectableCourses,
    electiveGroups: currentOffering.courseGroups,
    summary: {
      heading: `${formatLevel(currentOffering.level)} ${formatSemester(currentOffering.semester)}`,
      expectedUnits: currentOffering.expectedUnits ?? 0,
      totalCourses:
        currentOffering.courses.length +
        currentOffering.courseGroups.reduce((sum, group) => sum + group.options.length, 0),
    },
    registration,
    window: getRegistrationWindow(),
    evaluation,
    departmentLimits,
    carryoverCatalogue,
    sharedGstCatalogue: dedupedGst,
  };
}

export async function getAdviserDashboardData() {
  const session = await auth();
  if (!session?.user || session.user.role !== "adviser") return null;

  const registrations = listAllRegistrations();

  return {
    adviser: { name: session.user.name ?? "Adviser", level: session.user.currentLevel ?? 500 },
    submissions: registrations,
  };
}

export async function getAdminDashboardData() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;

  const registrations = listAllRegistrations();
  const window = getRegistrationWindow();

  const counts = {
    draft: registrations.filter((record) => record.status === "draft").length,
    submitted: registrations.filter((record) => record.status === "submitted").length,
    approved: registrations.filter((record) => record.status === "approved").length,
    queried: registrations.filter((record) => record.status === "queried").length,
  };

  return {
    admin: { name: session.user.name ?? "Admin" },
    window,
    registrations,
    counts,
    curriculumOverrides: listCurriculumOverrides(),
  };
}

export type { CurriculumOverride };
