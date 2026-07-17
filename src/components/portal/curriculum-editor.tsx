"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Loader2, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveCurriculumCourseAction } from "@/lib/portal/actions";
import type { CatalogueEntry } from "@/lib/portal/catalogue";
import type { CurriculumOverride } from "@/lib/portal/curriculum-store";

type Props = {
  departments: string[];
  overrides: CurriculumOverride[];
  catalogue: CatalogueEntry[];
};

const emptyForm = {
  code: "",
  title: "",
  creditUnits: 2,
  courseType: "core" as CurriculumOverride["courseType"],
  prerequisites: "",
  department: "",
  level: 100,
  semester: 1 as 1 | 2,
  note: "",
};

export function CurriculumEditor({ departments, overrides, catalogue }: Props) {
  const [form, setForm] = useState({ ...emptyForm, department: departments[0] ?? "" });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const loadFromCatalogue = () => {
    const found = catalogue.find(
      (entry) => entry.code.toUpperCase() === form.code.trim().toUpperCase(),
    );
    if (!found) {
      toast.info("No matching course found — you can add it as a new course.");
      return;
    }
    setForm({
      code: found.code,
      title: found.title,
      creditUnits: found.creditUnits,
      courseType: found.courseType,
      prerequisites: found.prerequisites.join(", "),
      department: found.department,
      level: found.level,
      semester: found.semester,
      note: found.note ?? "",
    });
    toast.success(`Loaded ${found.code}.`);
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveCurriculumCourseAction({
        code: form.code,
        title: form.title,
        creditUnits: Number(form.creditUnits),
        courseType: form.courseType,
        prerequisites: form.prerequisites
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        department: form.department,
        level: Number(form.level),
        semester: form.semester,
        note: form.note.trim() ? form.note.trim() : undefined,
      });
      if (result.ok) {
        toast.success("Course saved. Students will see the update.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not save.");
      }
    });
  };

  return (
    <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            <BookOpen className="h-3.5 w-3.5" /> Curriculum editor
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--oui-black)]">
            Update or add a course
          </h3>
          <p className="mt-1 text-sm text-[var(--oui-ink)]">
            Type a course code and press <em>Load</em> to edit it, or fill everything in to add a
            brand-new course. Changes take effect immediately.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Course code
            <div className="mt-1 flex gap-2">
              <input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="CPE 515"
                className="w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
              />
              <button
                type="button"
                onClick={loadFromCatalogue}
                className="rounded-2xl border border-[var(--oui-border)] px-3 text-xs font-semibold text-[var(--oui-ink)] hover:border-[var(--oui-gold)]"
              >
                Load
              </button>
            </div>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)] sm:col-span-2">
            Title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Robotics and Automation"
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Credit units
            <input
              type="number"
              min={0}
              value={form.creditUnits}
              onChange={(event) => setForm({ ...form, creditUnits: Number(event.target.value) })}
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Course type
            <select
              value={form.courseType}
              onChange={(event) =>
                setForm({ ...form, courseType: event.target.value as CurriculumOverride["courseType"] })
              }
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            >
              <option value="core">Compulsory</option>
              <option value="elective">Elective</option>
              <option value="gst">General Studies</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Department
            <select
              value={form.department}
              onChange={(event) => setForm({ ...form, department: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            >
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Level
            <select
              value={form.level}
              onChange={(event) => setForm({ ...form, level: Number(event.target.value) })}
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            >
              {[100, 200, 300, 400, 500].map((level) => (
                <option key={level} value={level}>
                  {level} Level
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Semester
            <select
              value={form.semester}
              onChange={(event) => setForm({ ...form, semester: Number(event.target.value) as 1 | 2 })}
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            >
              <option value={1}>First</option>
              <option value={2}>Second</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)] sm:col-span-2">
            Prerequisites (comma-separated codes)
            <input
              value={form.prerequisites}
              onChange={(event) => setForm({ ...form, prerequisites: event.target.value })}
              placeholder="e.g. CPE 304, CPE 305"
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)] sm:col-span-2">
            Note (optional)
            <textarea
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              rows={2}
              placeholder="e.g. Elective added for the 2025 curriculum review."
              className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
            />
          </label>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--oui-gold)] px-5 py-3 text-sm font-semibold text-[var(--oui-black)] transition hover:bg-[var(--oui-gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save course
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...emptyForm, department: departments[0] ?? "" })}
            className="w-full rounded-full border border-[var(--oui-border)] px-4 py-2 text-sm text-[var(--oui-ink)] hover:border-[var(--oui-gold)]"
          >
            Reset form
          </button>

          <div className="rounded-2xl border border-[var(--oui-border)] bg-[var(--oui-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--oui-ink)]">
              Recent changes ({overrides.length})
            </p>
            <AnimatePresence>
              {overrides.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--oui-ink)]">
                  No curriculum changes yet.
                </p>
              ) : (
                <motion.ul layout className="mt-2 space-y-2 text-xs">
                  {overrides
                    .slice()
                    .reverse()
                    .slice(0, 6)
                    .map((entry) => (
                      <li key={entry.code} className="rounded-xl border border-[var(--oui-border)] bg-white p-2">
                        <p className="font-semibold text-[var(--oui-black)]">
                          {entry.code} · {entry.title}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--oui-ink)]">
                          {entry.department} · {entry.level}L · Sem {entry.semester} · {entry.creditUnits} units
                        </p>
                      </li>
                    ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
