"use client";

import { motion } from "framer-motion";
import { Download, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { setWindowAction } from "@/lib/portal/actions";
import type { RegistrationRecord, RegistrationWindow } from "@/lib/registration/store";
import { cn } from "@/lib/utils";

type Props = {
  window: RegistrationWindow;
  registrations: RegistrationRecord[];
  counts: { draft: number; submitted: number; approved: number; queried: number };
};

function toCsv(records: RegistrationRecord[]) {
  const header = [
    "matric_number",
    "student_name",
    "department",
    "level",
    "semester",
    "status",
    "total_units",
    "submitted_at",
    "adviser_action",
    "adviser_comment",
    "selected_codes",
  ];
  const rows = records.map((record) =>
    [
      record.matricNumber,
      record.studentName,
      record.departmentName,
      record.level,
      record.semester,
      record.status,
      record.totalUnits,
      record.submittedAt ?? "",
      record.adviserAction ?? "",
      (record.adviserComment ?? "").replace(/\n/g, " "),
      record.selectedCodes.join("; "),
    ]
      .map((value) => {
        const raw = String(value ?? "");
        return raw.includes(",") || raw.includes('"')
          ? `"${raw.replace(/"/g, '""')}"`
          : raw;
      })
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function AdminPanel({ window, registrations, counts }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [semesterInput, setSemesterInput] = useState<1 | 2>(window.semester);
  const [sessionInput, setSessionInput] = useState(window.session);

  const submitted = useMemo(
    () => registrations.filter((record) => record.status !== "draft"),
    [registrations],
  );

  const toggleWindow = () => {
    startTransition(async () => {
      const result = await setWindowAction({ isOpen: !window.isOpen });
      if (result.ok) {
        toast.success(`Registration window ${!window.isOpen ? "opened" : "closed"}.`);
        router.refresh();
      }
    });
  };

  const persistWindow = () => {
    startTransition(async () => {
      await setWindowAction({ semester: semesterInput, session: sessionInput });
      toast.success("Window settings saved.");
      router.refresh();
    });
  };

  const downloadCsv = () => {
    const csv = toCsv(submitted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `regportal-submissions-${sessionInput.replace("/", "-")}-s${semesterInput}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <section className="space-y-6">
        <motion.div
          layout
          className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            Registration window
          </p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-[var(--oui-black)]">
                {window.isOpen ? "Open" : "Closed"}
              </p>
              <p className="text-xs text-[var(--oui-ink)]">
                {window.session} · Semester {window.semester}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleWindow}
              disabled={pending}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                window.isOpen
                  ? "border-[var(--oui-crimson)] text-[var(--oui-crimson-dark)]"
                  : "border-emerald-500 text-emerald-800",
              )}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : window.isOpen ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {window.isOpen ? "Close window" : "Open window"}
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
              Session
              <input
                value={sessionInput}
                onChange={(event) => setSessionInput(event.target.value)}
                className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
              Active semester
              <select
                value={semesterInput}
                onChange={(event) => setSemesterInput(Number(event.target.value) as 1 | 2)}
                className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
              >
                <option value={1}>First</option>
                <option value={2}>Second</option>
              </select>
            </label>
            <button
              type="button"
              onClick={persistWindow}
              disabled={pending}
              className="rounded-full bg-[var(--oui-black)] px-4 py-2 text-sm font-semibold text-[var(--oui-gold)] disabled:opacity-60"
            >
              Save window settings
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { label: "Draft", value: counts.draft, tone: "bg-[var(--oui-surface)]" },
              { label: "Submitted", value: counts.submitted, tone: "bg-[color:color-mix(in_srgb,var(--oui-gold)_20%,white)]" },
              { label: "Approved", value: counts.approved, tone: "bg-emerald-50" },
              { label: "Queried", value: counts.queried, tone: "bg-[color:color-mix(in_srgb,var(--oui-crimson)_10%,white)]" },
            ] as const
          ).map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-2xl border border-[var(--oui-border)] p-4",
                stat.tone,
              )}
            >
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--oui-ink)]">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--oui-black)]">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
              Submissions
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--oui-black)]">
              Active session · {registrations.length} student record{registrations.length === 1 ? "" : "s"}
            </h3>
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--oui-gold)] px-4 py-2 text-sm font-semibold text-[var(--oui-black)] transition hover:bg-[var(--oui-gold-soft)]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
              <tr className="border-b border-[var(--oui-border)]">
                <th className="py-2 pr-4">Matric</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">Units</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--oui-ink)]">
                    No records yet.
                  </td>
                </tr>
              ) : (
                registrations.map((record) => (
                  <tr key={record.studentLoginId} className="border-b border-[var(--oui-border)] text-[var(--oui-ink)]">
                    <td className="py-2 pr-4 font-semibold text-[var(--oui-black)]">{record.matricNumber}</td>
                    <td className="py-2 pr-4">{record.studentName}</td>
                    <td className="py-2 pr-4">{record.departmentName}</td>
                    <td className="py-2 pr-4">{record.level}</td>
                    <td className="py-2 pr-4">{record.totalUnits}</td>
                    <td className="py-2 pr-4 uppercase tracking-[0.18em] text-xs">{record.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
