import { describe, expect, it } from "vitest";

import { demoCompletedCourses, demoStudentOfferings } from "@/lib/demo/course-data";
import { evaluateRegistrationSelection } from "@/lib/registration/constraints";

describe("evaluateRegistrationSelection", () => {
  it("flags missing prerequisites", () => {
    const offering = {
      ...demoStudentOfferings[0],
      courses: [
        ...demoStudentOfferings[0].courses,
        {
          code: "CPE 600",
          title: "Advanced Constraint Topic",
          creditUnits: 2,
          courseType: "core" as const,
          prerequisites: ["CPE 777"],
          isZeroUnit: false,
        },
      ],
    };

    const evaluation = evaluateRegistrationSelection({
      offering,
      selectedCourseCodes: ["CPE 600"],
      completedCourseCodes: demoCompletedCourses,
    });

    expect(evaluation.issues.some((issue) => issue.kind === "missing_prerequisite")).toBe(true);
  });

  it("warns on overload relative to expected units", () => {
    const offering = {
      ...demoStudentOfferings[0],
      courses: [
        ...demoStudentOfferings[0].courses,
        {
          code: "CPE 599",
          title: "Advanced Systems Seminar",
          creditUnits: 3,
          courseType: "core" as const,
          prerequisites: [],
          isZeroUnit: false,
        },
      ],
    };

    const evaluation = evaluateRegistrationSelection({
      offering,
      selectedCourseCodes: [
        "CPE 509",
        "CPE 521",
        "CPE 511",
        "CPE 591",
        "GEC 501",
        "CPE 517",
        "CPE 525",
        "CPE 507",
        "CPE 599",
        "CPE 515",
      ],
      completedCourseCodes: demoCompletedCourses,
    });

    expect(evaluation.totalUnits).toBeGreaterThan(evaluation.expectedUnits ?? 0);
    expect(evaluation.issues.some((issue) => issue.kind === "credit_overload")).toBe(true);
  });

  it("flags already completed courses", () => {
    const evaluation = evaluateRegistrationSelection({
      offering: demoStudentOfferings[0],
      selectedCourseCodes: ["GEC 501", "CPE 302"],
      completedCourseCodes: demoCompletedCourses,
    });

    expect(evaluation.issues.some((issue) => issue.kind === "already_completed")).toBe(true);
  });

  it("requires elective group choice", () => {
    const evaluation = evaluateRegistrationSelection({
      offering: demoStudentOfferings[0],
      selectedCourseCodes: offeringCoreCodesOnly(demoStudentOfferings[0]),
      completedCourseCodes: demoCompletedCourses,
    });

    expect(evaluation.issues.some((issue) => issue.kind === "missing_required_elective_choice")).toBe(true);
  });
});

function offeringCoreCodesOnly(offering: (typeof demoStudentOfferings)[number]) {
  return offering.courses.map((course) => course.code);
}

describe("department min/max unit rules", () => {
  it("errors when below a department minimum", () => {
    const evaluation = evaluateRegistrationSelection({
      offering: demoStudentOfferings[0],
      selectedCourseCodes: ["CPE 509"],
      completedCourseCodes: demoCompletedCourses,
      departmentMinUnits: 15,
      departmentMaxUnits: 24,
    });

    const underload = evaluation.issues.find((issue) => issue.kind === "credit_underload");
    expect(underload?.severity).toBe("error");
  });

  it("errors when above a department maximum", () => {
    const offering = demoStudentOfferings[0];
    const evaluation = evaluateRegistrationSelection({
      offering,
      selectedCourseCodes: [
        ...offering.courses.map((course) => course.code),
        offering.courseGroups[0]?.options[0]?.code ?? "",
      ].filter(Boolean),
      completedCourseCodes: demoCompletedCourses,
      departmentMinUnits: 15,
      departmentMaxUnits: 18,
    });

    const overload = evaluation.issues.find((issue) => issue.kind === "credit_overload");
    expect(overload?.severity).toBe("error");
  });
});
