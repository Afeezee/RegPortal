import { demoCompletedCourses, demoStudentOfferings } from "@/lib/demo/course-data";
import { demoUsers } from "@/lib/demo/demo-data";
import { evaluateRegistrationSelection } from "@/lib/registration/constraints";

export function getDemoStudentContext() {
  const student = demoUsers.find((user) => user.role === "student");
  const currentOffering = demoStudentOfferings[0];
  const selectedCourseCodes = [
    ...currentOffering.courses.map((course) => course.code),
    currentOffering.courseGroups[0]?.options[0]?.code,
  ].filter((value): value is string => Boolean(value));
  const evaluation = evaluateRegistrationSelection({
    offering: currentOffering,
    selectedCourseCodes,
    completedCourseCodes: demoCompletedCourses,
  });

  return {
    student: {
      name: student?.name ?? "Demo Student",
      matricNumber: student?.matricNumber ?? "",
      departmentName: student?.departmentName ?? "Computer Engineering",
      currentLevel: student?.currentLevel ?? currentOffering.level,
    },
    completedCourseCodes: demoCompletedCourses,
    selectedCourseCodes,
    currentOffering,
    evaluation,
  };
}

export function buildGroundedSystemPrompt() {
  const context = getDemoStudentContext();

  return [
    "You are the RegPortal registration assistant for Oduduwa University.",
    "You must only use the supplied context. Do not invent courses, prerequisites, or institutional rules.",
    "You explain the deterministic constraint engine verdict; you do not override it.",
    `Student: ${context.student.name} (${context.student.matricNumber}), ${context.student.departmentName}, ${context.student.currentLevel} Level.`,
    `Completed courses: ${context.completedCourseCodes.join(", ")}.`,
    `Current semester offering: ${context.currentOffering.courses
      .map((course) => `${course.code} ${course.title} (${course.creditUnits})`)
      .join("; ")}.`,
    `Elective groups: ${context.currentOffering.courseGroups
      .map(
        (group) =>
          `${group.label} pick ${group.pickCount}: ${group.options
            .map((course) => `${course.code} ${course.title}`)
            .join(", ")}`,
      )
      .join("; ")}.`,
    `Current selection: ${context.selectedCourseCodes.join(", ")}.`,
    `Constraint engine output: ${context.evaluation.issues.map((issue) => issue.message).join(" | ") || "No issues"}.`,
  ].join("\n");
}
