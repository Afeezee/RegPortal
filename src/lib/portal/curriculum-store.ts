import type { ParsedCourse } from "@/lib/handbook/types";
import type { CatalogueEntry } from "@/lib/portal/catalogue";
import { findCourseByCode, getFullCatalogue } from "@/lib/portal/catalogue";

export type CurriculumOverride = {
  code: string;
  title: string;
  creditUnits: number;
  courseType: ParsedCourse["courseType"];
  prerequisites: string[];
  department: string;
  level: number;
  semester: 1 | 2;
  note?: string;
};

const globalKey = Symbol.for("regportal.curriculum.overrides");

function getStore(): Map<string, CurriculumOverride> {
  const globalObj = globalThis as unknown as Record<symbol, Map<string, CurriculumOverride>>;
  if (!globalObj[globalKey]) {
    globalObj[globalKey] = new Map();
  }
  return globalObj[globalKey];
}

export function upsertCurriculumOverride(input: CurriculumOverride) {
  const store = getStore();
  const key = input.code.toUpperCase();
  store.set(key, { ...input, code: key });
  return store.get(key)!;
}

export function listCurriculumOverrides(): CurriculumOverride[] {
  return [...getStore().values()];
}

export function getEffectiveCatalogue(): CatalogueEntry[] {
  const base = getFullCatalogue();
  const overrides = getStore();
  if (overrides.size === 0) return base;

  const merged: CatalogueEntry[] = base.map((entry) => {
    const override = overrides.get(entry.code.toUpperCase());
    if (!override) return entry;
    return {
      ...entry,
      title: override.title,
      creditUnits: override.creditUnits,
      courseType: override.courseType,
      prerequisites: override.prerequisites,
      note: override.note ?? entry.note,
      department: override.department,
      level: override.level,
      semester: override.semester,
    };
  });

  const knownCodes = new Set(merged.map((entry) => entry.code.toUpperCase()));
  for (const override of overrides.values()) {
    if (!knownCodes.has(override.code)) {
      merged.push({
        code: override.code,
        title: override.title,
        creditUnits: override.creditUnits,
        courseType: override.courseType,
        prerequisites: override.prerequisites,
        isZeroUnit: override.creditUnits === 0,
        note: override.note,
        department: override.department,
        level: override.level,
        semester: override.semester,
      });
    }
  }

  return merged;
}

export function findEffectiveCourse(code: string): CatalogueEntry | null {
  const override = getStore().get(code.toUpperCase());
  if (override) {
    return {
      code: override.code,
      title: override.title,
      creditUnits: override.creditUnits,
      courseType: override.courseType,
      prerequisites: override.prerequisites,
      isZeroUnit: override.creditUnits === 0,
      note: override.note,
      department: override.department,
      level: override.level,
      semester: override.semester,
    };
  }
  return findCourseByCode(code);
}
