"use client";

import { useMemo, useState } from "react";

import { CourseCard } from "@/components/portal/course-card";
import type { ParsedCourse } from "@/lib/handbook/types";

export type CatalogueRow = {
  college: string;
  department: string;
  level: number;
  semester: 1 | 2;
  expectedUnits: number | null;
  courses: ParsedCourse[];
};

export function CatalogueBrowser({ rows }: { rows: CatalogueRow[] }) {
  const departments = useMemo(
    () => Array.from(new Set(rows.map((row) => row.department))).sort(),
    [rows],
  );
  const [department, setDepartment] = useState<string>(departments[0] ?? "");
  const filtered = rows.filter((row) => row.department === department);

  return (
    <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            Catalogue
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--oui-black)]">
            Handbook-derived course listings
          </h3>
        </div>
        <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
          Department
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="mt-1 block w-64 rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
          >
            {departments.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--oui-ink)]">No offerings recorded.</p>
        ) : (
          filtered
            .sort((a, b) => a.level - b.level || a.semester - b.semester)
            .map((row) => (
              <div key={`${row.level}-${row.semester}`}>
                <h4 className="text-sm font-semibold text-[var(--oui-black)]">
                  {row.level} Level · Semester {row.semester}
                  {row.expectedUnits ? (
                    <span className="ml-2 text-xs font-normal text-[var(--oui-ink)]">
                      · Expected {row.expectedUnits} units
                    </span>
                  ) : null}
                </h4>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {row.courses.map((course) => (
                    <CourseCard key={`${row.level}-${row.semester}-${course.code}`} course={course} />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </section>
  );
}
