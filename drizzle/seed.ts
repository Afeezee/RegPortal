import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  academicSessions,
  colleges,
  courseGroupOptions,
  courseGroups,
  courseOfferings,
  courses,
  departments,
  levelSemesters,
  prerequisites,
} from "@/lib/db/schema";
import type { HandbookSeedData } from "@/lib/handbook/types";

async function main() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required before running the seed script.");
  }

  const seedPath = resolve(process.cwd(), "drizzle", "seed-data", "handbook-seed.json");
  if (!existsSync(seedPath)) {
    throw new Error("Run npm run seed:extract before seeding the database.");
  }

  const seedData = JSON.parse(readFileSync(seedPath, "utf8")) as HandbookSeedData;

  const levelSemesterIds = new Map<string, string>();
  for (const level of [100, 200, 300, 400, 500]) {
    for (const semester of [1, 2] as const) {
      const [row] = await db
        .insert(levelSemesters)
        .values({ level, semester, label: semester === 1 ? "First" : "Second" })
        .onConflictDoNothing()
        .returning({ id: levelSemesters.id });

      if (row?.id) {
        levelSemesterIds.set(`${level}-${semester}`, row.id);
      } else {
        const [existing] = await db
          .select({ id: levelSemesters.id })
          .from(levelSemesters)
          .where(and(eq(levelSemesters.level, level), eq(levelSemesters.semester, semester)))
          .limit(1);
        if (existing) {
          levelSemesterIds.set(`${level}-${semester}`, existing.id);
        }
      }
    }
  }

  const courseIdByCode = new Map<string, string>();
  const departmentIdByName = new Map<string, string>();

  for (const collegeSeed of seedData.colleges) {
    const [insertedCollege] = await db
      .insert(colleges)
      .values({ name: collegeSeed.name })
      .onConflictDoNothing()
      .returning({ id: colleges.id });

    const collegeId = insertedCollege?.id
      ? insertedCollege.id
      : (
          await db.select({ id: colleges.id }).from(colleges).where(eq(colleges.name, collegeSeed.name)).limit(1)
        )[0]?.id;

    if (!collegeId) {
      continue;
    }

    for (const departmentSeed of collegeSeed.departments) {
      const [insertedDepartment] = await db
        .insert(departments)
        .values({
          collegeId,
          name: departmentSeed.name,
          registrationMinUnits: departmentSeed.registrationMinUnits,
          registrationMaxUnits: departmentSeed.registrationMaxUnits,
        })
        .onConflictDoNothing()
        .returning({ id: departments.id });

      const departmentId = insertedDepartment?.id
        ? insertedDepartment.id
        : (
            await db
              .select({ id: departments.id })
              .from(departments)
              .where(eq(departments.name, departmentSeed.name))
              .limit(1)
          )[0]?.id;

      if (!departmentId) {
        continue;
      }

      departmentIdByName.set(departmentSeed.name, departmentId);

      for (const offering of departmentSeed.offerings) {
        const levelSemesterId = levelSemesterIds.get(`${offering.level}-${offering.semester}`);
        if (!levelSemesterId) {
          continue;
        }

        for (const course of offering.courses) {
          const [insertedCourse] = await db
            .insert(courses)
            .values({
              code: course.code,
              title: course.title,
              creditUnits: course.creditUnits,
              courseType: course.courseType,
              departmentId: course.courseType === "gst" ? null : departmentId,
              isZeroUnit: course.isZeroUnit,
              courseCategory: course.courseCategory,
              metadata: course.note ? { note: course.note } : {},
            })
            .onConflictDoNothing()
            .returning({ id: courses.id });

          const courseId = insertedCourse?.id
            ? insertedCourse.id
            : (
                await db.select({ id: courses.id }).from(courses).where(eq(courses.code, course.code)).limit(1)
              )[0]?.id;

          if (!courseId) {
            continue;
          }

          courseIdByCode.set(course.code, courseId);

          await db
            .insert(courseOfferings)
            .values({
              courseId,
              departmentId,
              levelSemesterId,
              expectedSemesterUnits: offering.expectedUnits,
              isElective: course.courseType === "elective",
            })
            .onConflictDoNothing();
        }

        for (const group of offering.courseGroups) {
          const [insertedGroup] = await db
            .insert(courseGroups)
            .values({
              departmentId,
              levelSemesterId,
              label: group.label,
              pickCount: group.pickCount,
              sharedUnits: group.sharedUnits,
              note: group.note,
            })
            .returning({ id: courseGroups.id });

          const groupId = insertedGroup?.id;
          if (!groupId) {
            continue;
          }

          for (const [index, course] of group.options.entries()) {
            const [insertedCourse] = await db
              .insert(courses)
              .values({
                code: course.code,
                title: course.title,
                creditUnits: course.creditUnits,
                courseType: course.courseType,
                departmentId: course.courseType === "gst" ? null : departmentId,
                isZeroUnit: course.isZeroUnit,
                courseCategory: course.courseCategory,
                metadata: course.note ? { note: course.note } : {},
              })
              .onConflictDoNothing()
              .returning({ id: courses.id });

            const courseId = insertedCourse?.id
              ? insertedCourse.id
              : (
                  await db.select({ id: courses.id }).from(courses).where(eq(courses.code, course.code)).limit(1)
                )[0]?.id;

            if (!courseId) {
              continue;
            }

            courseIdByCode.set(course.code, courseId);

            await db
              .insert(courseGroupOptions)
              .values({
                courseGroupId: groupId,
                courseId,
                sortOrder: index,
              })
              .onConflictDoNothing();

            await db
              .insert(courseOfferings)
              .values({
                courseId,
                departmentId,
                levelSemesterId,
                courseGroupId: groupId,
                expectedSemesterUnits: offering.expectedUnits,
                isElective: true,
              })
              .onConflictDoNothing();
          }
        }
      }
    }
  }

  for (const collegeSeed of seedData.colleges) {
    for (const departmentSeed of collegeSeed.departments) {
      for (const offering of departmentSeed.offerings) {
        for (const course of [...offering.courses, ...offering.courseGroups.flatMap((group) => group.options)]) {
          const courseId = courseIdByCode.get(course.code);
          if (!courseId) {
            continue;
          }

          for (const prerequisiteCode of course.prerequisites) {
            const prerequisiteCourseId = courseIdByCode.get(prerequisiteCode);
            if (!prerequisiteCourseId) {
              continue;
            }

            await db
              .insert(prerequisites)
              .values({
                courseId,
                prerequisiteCourseId,
              })
              .onConflictDoNothing();
          }
        }
      }
    }
  }

  await db
    .insert(academicSessions)
    .values({
      name: "2025/2026",
      isActive: true,
      activeSemester: 1,
    })
    .onConflictDoNothing();

  console.log("Seed completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
