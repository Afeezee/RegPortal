"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  demoCompletedCourses,
  demoOutstandingCourses,
  demoStudentOfferings,
} from "@/lib/demo/course-data";
import { demoUsers } from "@/lib/demo/demo-data";
import {
  clearCatalogueCache,
  getDepartmentCatalogue,
  getSharedGstCatalogue,
} from "@/lib/portal/catalogue";
import {
  listCurriculumOverrides,
  upsertCurriculumOverride,
  type CurriculumOverride,
} from "@/lib/portal/curriculum-store";
import { evaluateRegistrationSelection } from "@/lib/registration/constraints";
import {
  adviserDecision,
  getRegistrationForStudent,
  setPostSummary,
  setRegistrationWindow,
  setSelectionForStudent,
  submitRegistration,
  upsertRegistrationDraft,
} from "@/lib/registration/store";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

function currentOfferingForStudent() {
  return demoStudentOfferings[0];
}

function studentAdvisee() {
  return demoUsers.find((user) => user.role === "student");
}

function ensureDraft(loginId: string) {
  const existing = getRegistrationForStudent(loginId);
  if (existing) return existing;

  const student = demoUsers.find((user) => user.loginId === loginId);
  const offering = currentOfferingForStudent();
  return upsertRegistrationDraft(loginId, {
    studentName: student?.name ?? "Student",
    matricNumber: student?.matricNumber ?? loginId,
    departmentName: student?.departmentName ?? "Computer Engineering",
    level: student?.currentLevel ?? offering.level,
    semester: offering.semester,
    selectedCodes: [],
  });
}

export async function toggleCourseAction(courseCode: string) {
  const session = await requireSession();
  if (session.user.role !== "student") throw new Error("Only students can register");

  const record = ensureDraft(session.user.loginId);
  if (record.status === "approved") {
    return { ok: false, message: "Registration already approved; contact the exam officer to reopen." };
  }

  const nextSet = new Set(record.selectedCodes);
  if (nextSet.has(courseCode)) {
    nextSet.delete(courseCode);
  } else {
    nextSet.add(courseCode);
  }

  setSelectionForStudent(session.user.loginId, Array.from(nextSet));
  revalidatePath("/student");
  return { ok: true };
}

export async function submitRegistrationAction() {
  const session = await requireSession();
  if (session.user.role !== "student") throw new Error("Only students can submit");

  const record = ensureDraft(session.user.loginId);
  const offering = currentOfferingForStudent();
  const student = demoUsers.find((user) => user.loginId === session.user.loginId);
  const departmentName = student?.departmentName ?? "Computer Engineering";
  const externalCatalogue = [
    ...getDepartmentCatalogue(departmentName).filter((entry) => entry.level < (student?.currentLevel ?? offering.level)),
    ...getSharedGstCatalogue(),
  ];

  const evaluation = evaluateRegistrationSelection({
    offering,
    selectedCourseCodes: record.selectedCodes,
    completedCourseCodes: demoCompletedCourses,
    externalCatalogue,
    outstandingCourseCodes: demoOutstandingCourses,
  });

  const hasErrors = evaluation.issues.some((issue) => issue.severity === "error");
  if (hasErrors) {
    return {
      ok: false,
      message: "Cannot submit while errors exist. Resolve prerequisite or duplicate issues first.",
      issues: evaluation.issues,
    };
  }

  submitRegistration(session.user.loginId, evaluation.totalUnits);
  revalidatePath("/student");
  revalidatePath("/adviser");
  revalidatePath("/admin");
  return { ok: true, totalUnits: evaluation.totalUnits, issueCount: evaluation.issues.length };
}

export async function savePostSummaryAction(summary: string) {
  const session = await requireSession();
  if (session.user.role !== "student") throw new Error("Only students can save summary");
  setPostSummary(session.user.loginId, summary);
  revalidatePath("/student");
  return { ok: true };
}

export async function adviserDecisionAction(action: "approved" | "queried", comment: string) {
  const session = await requireSession();
  if (session.user.role !== "adviser") throw new Error("Only advisers");
  const advisee = studentAdvisee();
  if (!advisee) return { ok: false, message: "No advisee assigned." };
  adviserDecision(advisee.loginId, action, comment.trim());
  revalidatePath("/adviser");
  revalidatePath("/student");
  return { ok: true };
}

export async function setWindowAction(patch: { isOpen?: boolean; semester?: 1 | 2; session?: string }) {
  const session = await requireSession();
  if (session.user.role !== "admin") throw new Error("Only admins");
  setRegistrationWindow(patch);
  revalidatePath("/admin");
  revalidatePath("/student");
  return { ok: true };
}

export async function saveCurriculumCourseAction(
  input: CurriculumOverride,
): Promise<{ ok: boolean; message?: string; overrides?: CurriculumOverride[] }> {
  const session = await requireSession();
  if (session.user.role !== "admin") throw new Error("Only admins");

  const code = input.code.trim().toUpperCase();
  if (!code || !input.title.trim()) {
    return { ok: false, message: "Course code and title are required." };
  }
  if (input.creditUnits < 0 || Number.isNaN(input.creditUnits)) {
    return { ok: false, message: "Credit units must be zero or a positive number." };
  }

  upsertCurriculumOverride({
    ...input,
    code,
    title: input.title.trim(),
    prerequisites: input.prerequisites.map((entry) => entry.trim()).filter(Boolean),
    department: input.department.trim(),
  });

  clearCatalogueCache();
  revalidatePath("/admin");
  revalidatePath("/student");
  return { ok: true, overrides: listCurriculumOverrides() };
}
