import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  DepartmentSeed,
  HandbookSeedData,
  ParsedCourse,
  SemesterOffering,
} from "@/lib/handbook/types";

let cached: HandbookSeedData | null | undefined;

function loadSeed(): HandbookSeedData | null {
  if (cached !== undefined) return cached;
  const seedPath = resolve(process.cwd(), "drizzle", "seed-data", "handbook-seed.json");
  if (!existsSync(seedPath)) {
    cached = null;
    return null;
  }
  try {
    cached = JSON.parse(readFileSync(seedPath, "utf8")) as HandbookSeedData;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

function coursesFromOffering(offering: SemesterOffering) {
  return [...offering.courses, ...offering.courseGroups.flatMap((group) => group.options)];
}

export type CatalogueEntry = ParsedCourse & {
  department: string;
  level: number;
  semester: 1 | 2;
};

export function getFullCatalogue(): CatalogueEntry[] {
  const seed = loadSeed();
  if (!seed) return [];
  const entries: CatalogueEntry[] = [];
  for (const college of seed.colleges) {
    for (const department of college.departments) {
      for (const offering of department.offerings) {
        for (const course of coursesFromOffering(offering)) {
          entries.push({
            ...course,
            department: department.name,
            level: offering.level,
            semester: offering.semester,
          });
        }
      }
    }
  }
  return entries;
}

export function getDepartmentCatalogue(departmentName: string): CatalogueEntry[] {
  return getFullCatalogue().filter((entry) => entry.department === departmentName);
}

export function getSharedGstCatalogue(): CatalogueEntry[] {
  const seen = new Set<string>();
  const gsts: CatalogueEntry[] = [];
  for (const entry of getFullCatalogue()) {
    if ((entry.code.startsWith("GST") || entry.code.startsWith("GNS")) && !seen.has(entry.code)) {
      seen.add(entry.code);
      gsts.push(entry);
    }
  }
  return gsts;
}

export function getDepartmentSeed(departmentName: string): DepartmentSeed | null {
  const seed = loadSeed();
  if (!seed) return null;
  for (const college of seed.colleges) {
    const match = college.departments.find((department) => department.name === departmentName);
    if (match) return match;
  }
  return null;
}

export function findCourseByCode(code: string): CatalogueEntry | null {
  return getFullCatalogue().find((entry) => entry.code.toUpperCase() === code.toUpperCase()) ?? null;
}

export function clearCatalogueCache() {
  cached = undefined;
}
