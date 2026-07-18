export const appRoles = ["student", "adviser", "admin"] as const;

export type AppRole = (typeof appRoles)[number];

export type SemesterNumber = 1 | 2;

export type CourseType = "core" | "elective" | "gst";

export type RegistrationStatus = "draft" | "submitted" | "approved" | "queried";

export type AccountStatus = "pending" | "active" | "suspended";
