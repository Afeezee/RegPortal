import { demoStudentOfferings } from "@/lib/demo/course-data";
import { demoUsers } from "@/lib/demo/demo-data";
import type { RegistrationStatus } from "@/lib/types";

export type AdviserAction = "approved" | "queried" | null;

export type RegistrationRecord = {
  studentLoginId: string;
  studentName: string;
  matricNumber: string;
  departmentName: string;
  level: number;
  semester: 1 | 2;
  selectedCodes: string[];
  status: RegistrationStatus;
  totalUnits: number;
  submittedAt: string | null;
  approvedAt: string | null;
  adviserAction: AdviserAction;
  adviserComment: string | null;
  postSummary: string | null;
};

export type RegistrationWindow = {
  session: string;
  semester: 1 | 2;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

type Store = {
  registrations: Map<string, RegistrationRecord>;
  window: RegistrationWindow;
};

const globalKey = Symbol.for("regportal.registration.store");

function createStore(): Store {
  const registrations = new Map<string, RegistrationRecord>();

  const student = demoUsers.find((user) => user.role === "student");
  const currentOffering = demoStudentOfferings[0];

  if (student && currentOffering) {
    const defaultSelection = [
      ...currentOffering.courses.map((course) => course.code),
      currentOffering.courseGroups[0]?.options[0]?.code,
    ].filter((value): value is string => Boolean(value));

    registrations.set(student.loginId, {
      studentLoginId: student.loginId,
      studentName: student.name,
      matricNumber: student.matricNumber ?? student.loginId,
      departmentName: student.departmentName ?? "Computer Engineering",
      level: student.currentLevel ?? currentOffering.level,
      semester: currentOffering.semester,
      selectedCodes: defaultSelection,
      status: "draft",
      totalUnits: 0,
      submittedAt: null,
      approvedAt: null,
      adviserAction: null,
      adviserComment: null,
      postSummary: null,
    });
  }

  return {
    registrations,
    window: {
      session: "2025/2026",
      semester: 1,
      isOpen: true,
      opensAt: null,
      closesAt: null,
    },
  };
}

function getStore(): Store {
  const globalObj = globalThis as unknown as Record<symbol, Store>;
  if (!globalObj[globalKey]) {
    globalObj[globalKey] = createStore();
  }
  return globalObj[globalKey];
}

export function getRegistrationWindow(): RegistrationWindow {
  return { ...getStore().window };
}

export function setRegistrationWindow(patch: Partial<RegistrationWindow>): RegistrationWindow {
  const store = getStore();
  store.window = { ...store.window, ...patch };
  return { ...store.window };
}

export function getRegistrationForStudent(loginId: string): RegistrationRecord | null {
  const record = getStore().registrations.get(loginId);
  return record ? { ...record, selectedCodes: [...record.selectedCodes] } : null;
}

export function upsertRegistrationDraft(
  loginId: string,
  patch: Partial<RegistrationRecord> & Pick<RegistrationRecord, "studentName" | "matricNumber" | "departmentName" | "level" | "semester">,
): RegistrationRecord {
  const store = getStore();
  const existing = store.registrations.get(loginId);
  const base: RegistrationRecord = {
    studentLoginId: loginId,
    studentName: existing?.studentName ?? patch.studentName,
    matricNumber: existing?.matricNumber ?? patch.matricNumber,
    departmentName: existing?.departmentName ?? patch.departmentName,
    level: existing?.level ?? patch.level,
    semester: existing?.semester ?? patch.semester,
    selectedCodes: existing?.selectedCodes ?? [],
    status: existing?.status ?? "draft",
    totalUnits: existing?.totalUnits ?? 0,
    submittedAt: existing?.submittedAt ?? null,
    approvedAt: existing?.approvedAt ?? null,
    adviserAction: existing?.adviserAction ?? null,
    adviserComment: existing?.adviserComment ?? null,
    postSummary: existing?.postSummary ?? null,
  };
  const next: RegistrationRecord = {
    ...base,
    ...patch,
    selectedCodes: patch.selectedCodes ?? base.selectedCodes,
  };
  store.registrations.set(loginId, next);
  return { ...next, selectedCodes: [...next.selectedCodes] };
}

export function setSelectionForStudent(loginId: string, codes: string[]): RegistrationRecord | null {
  const store = getStore();
  const record = store.registrations.get(loginId);
  if (!record) {
    return null;
  }
  if (record.status === "approved") {
    return { ...record };
  }
  const deduped = Array.from(new Set(codes.map((code) => code.trim()).filter(Boolean)));
  record.selectedCodes = deduped;
  record.status = record.status === "submitted" ? "draft" : record.status;
  store.registrations.set(loginId, record);
  return { ...record, selectedCodes: [...record.selectedCodes] };
}

export function submitRegistration(loginId: string, totalUnits: number): RegistrationRecord | null {
  const store = getStore();
  const record = store.registrations.get(loginId);
  if (!record) {
    return null;
  }
  record.status = "submitted";
  record.totalUnits = totalUnits;
  record.submittedAt = new Date().toISOString();
  record.adviserAction = null;
  record.adviserComment = null;
  record.approvedAt = null;
  store.registrations.set(loginId, record);
  return { ...record };
}

export function setPostSummary(loginId: string, summary: string): void {
  const store = getStore();
  const record = store.registrations.get(loginId);
  if (!record) return;
  record.postSummary = summary;
  store.registrations.set(loginId, record);
}

export function adviserDecision(
  loginId: string,
  action: "approved" | "queried",
  comment: string,
): RegistrationRecord | null {
  const store = getStore();
  const record = store.registrations.get(loginId);
  if (!record) {
    return null;
  }
  record.adviserAction = action;
  record.adviserComment = comment || null;
  if (action === "approved") {
    record.status = "approved";
    record.approvedAt = new Date().toISOString();
  } else {
    record.status = "queried";
    record.approvedAt = null;
  }
  store.registrations.set(loginId, record);
  return { ...record };
}

export function listAllRegistrations(): RegistrationRecord[] {
  return [...getStore().registrations.values()].map((record) => ({
    ...record,
    selectedCodes: [...record.selectedCodes],
  }));
}
