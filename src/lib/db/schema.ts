import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "adviser", "admin"]);
export const courseTypeEnum = pgEnum("course_type", ["core", "elective", "gst"]);
export const registrationStatusEnum = pgEnum("registration_status", [
  "draft",
  "submitted",
  "approved",
  "queried",
]);

export const colleges = pgTable(
  "colleges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("colleges_name_idx").on(table.name)],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collegeId: uuid("college_id")
      .references(() => colleges.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    code: text("code"),
    registrationMinUnits: integer("registration_min_units"),
    registrationMaxUnits: integer("registration_max_units"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("departments_name_idx").on(table.name)],
);

export const levelSemesters = pgTable(
  "level_semesters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: integer("level").notNull(),
    semester: smallint("semester").notNull(),
    label: text("label"),
  },
  (table) => [uniqueIndex("level_semesters_level_semester_idx").on(table.level, table.semester)],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    creditUnits: integer("credit_units").notNull().default(0),
    courseType: courseTypeEnum("course_type").notNull().default("core"),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    courseCategory: text("course_category"),
    isZeroUnit: boolean("is_zero_unit").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("courses_code_idx").on(table.code)],
);

export const prerequisites = pgTable(
  "prerequisites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    prerequisiteCourseId: uuid("prerequisite_course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    uniqueIndex("prerequisites_course_prerequisite_idx").on(
      table.courseId,
      table.prerequisiteCourseId,
    ),
  ],
);

export const courseGroups = pgTable("course_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "cascade" }),
  levelSemesterId: uuid("level_semester_id")
    .references(() => levelSemesters.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull(),
  pickCount: integer("pick_count").notNull().default(1),
  sharedUnits: integer("shared_units"),
  note: text("note"),
});

export const courseGroupOptions = pgTable(
  "course_group_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseGroupId: uuid("course_group_id")
      .references(() => courseGroups.id, { onDelete: "cascade" })
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("course_group_options_unique_idx").on(table.courseGroupId, table.courseId)],
);

export const courseOfferings = pgTable(
  "course_offerings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    levelSemesterId: uuid("level_semester_id")
      .references(() => levelSemesters.id, { onDelete: "cascade" })
      .notNull(),
    departmentId: uuid("department_id")
      .references(() => departments.id, { onDelete: "cascade" })
      .notNull(),
    courseGroupId: uuid("course_group_id").references(() => courseGroups.id, { onDelete: "set null" }),
    expectedSemesterUnits: integer("expected_semester_units"),
    isElective: boolean("is_elective").notNull().default(false),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("course_offerings_unique_idx").on(
      table.courseId,
      table.levelSemesterId,
      table.departmentId,
    ),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loginId: text("login_id").notNull(),
    email: text("email"),
    name: text("name").notNull(),
    role: roleEnum("role").notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_login_id_idx").on(table.loginId)],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    matricNumber: text("matric_number").notNull(),
    departmentId: uuid("department_id")
      .references(() => departments.id, { onDelete: "restrict" })
      .notNull(),
    currentLevel: integer("current_level").notNull(),
    email: text("email"),
  },
  (table) => [uniqueIndex("students_matric_number_idx").on(table.matricNumber)],
);

export const advisers = pgTable("advisers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  departmentId: uuid("department_id")
    .references(() => departments.id, { onDelete: "cascade" })
    .notNull(),
  level: integer("level").notNull(),
});

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title"),
});

export const academicSessions = pgTable(
  "academic_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    activeSemester: smallint("active_semester").notNull().default(1),
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("academic_sessions_name_idx").on(table.name)],
);

export const registrations = pgTable("registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .references(() => students.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => academicSessions.id, { onDelete: "cascade" })
    .notNull(),
  semester: smallint("semester").notNull(),
  status: registrationStatusEnum("status").notNull().default("draft"),
  adviserComment: text("adviser_comment"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const registrationItems = pgTable(
  "registration_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    registrationId: uuid("registration_id")
      .references(() => registrations.id, { onDelete: "cascade" })
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    source: text("source").default("manual").notNull(),
    note: text("note"),
  },
  (table) => [uniqueIndex("registration_items_unique_idx").on(table.registrationId, table.courseId)],
);

export const studentCompletedCourses = pgTable(
  "student_completed_courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    sessionId: uuid("session_id").references(() => academicSessions.id, { onDelete: "set null" }),
    grade: text("grade"),
    passed: boolean("passed").notNull().default(true),
  },
  (table) => [uniqueIndex("student_completed_courses_unique_idx").on(table.studentId, table.courseId)],
);

export const courseInsights = pgTable("course_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  insight: text("insight").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const constraintOverrides = pgTable("constraint_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationId: uuid("registration_id")
    .references(() => registrations.id, { onDelete: "cascade" })
    .notNull(),
  adminUserId: uuid("admin_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
