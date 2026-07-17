"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { CarryoverPicker } from "@/components/portal/carryover-picker";
import { CourseCard } from "@/components/portal/course-card";
import type { ParsedCourse, ParsedCourseGroup, SemesterOffering } from "@/lib/handbook/types";
import {
  savePostSummaryAction,
  submitRegistrationAction,
  toggleCourseAction,
} from "@/lib/portal/actions";
import type { CatalogueEntry } from "@/lib/portal/catalogue";
import type { RegistrationRecord, RegistrationWindow } from "@/lib/registration/store";
import type { ConstraintIssue } from "@/lib/registration/constraints";
import { cn } from "@/lib/utils";

type Props = {
  offering: SemesterOffering;
  coreCourses: ParsedCourse[];
  electiveGroups: ParsedCourseGroup[];
  registration: RegistrationRecord;
  window: RegistrationWindow;
  evaluation: {
    totalUnits: number;
    expectedUnits: number | null;
    issues: ConstraintIssue[];
  };
  completedCourses: string[];
  outstandingCourses: string[];
  carryoverCatalogue: CatalogueEntry[];
  sharedGstCatalogue: CatalogueEntry[];
};

async function fetchInsight(code: string, title: string) {
  try {
    const response = await fetch("/api/ai/course-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCode: code, title }),
    });
    if (!response.ok) throw new Error("Insight fetch failed");
    const body = (await response.json()) as { insight: string };
    return body.insight;
  } catch {
    return "Insight unavailable right now — try again in a moment.";
  }
}

export function RegistrationBoard({
  offering,
  coreCourses,
  electiveGroups,
  registration,
  window,
  evaluation,
  completedCourses,
  outstandingCourses,
  carryoverCatalogue,
  sharedGstCatalogue,
}: Props) {
  const router = useRouter();
  const selectedSet = useMemo(
    () => new Set(registration.selectedCodes.map((code) => code.toUpperCase())),
    [registration.selectedCodes],
  );
  const completedSet = useMemo(
    () => new Set(completedCourses.map((code) => code.toUpperCase())),
    [completedCourses],
  );

  const [pending, startTransition] = useTransition();
  const [summaryLoading, setSummaryLoading] = useState(false);

  const disabled = !window.isOpen || registration.status === "approved";

  const handleToggle = (code: string) => {
    startTransition(async () => {
      const result = await toggleCourseAction(code);
      if (!result.ok) {
        toast.error(result.message ?? "Could not update selection.");
      } else {
        router.refresh();
      }
    });
  };

  const handleSubmit = () => {
    if (disabled) {
      toast.error(
        registration.status === "approved"
          ? "Registration already approved."
          : "Registration window is currently closed.",
      );
      return;
    }

    startTransition(async () => {
      const result = await submitRegistrationAction();
      if (!result.ok) {
        toast.error(result.message ?? "Submission blocked by constraint engine.");
        return;
      }
      toast.success(`Registration submitted (${result.totalUnits} units).`);
      router.refresh();
      setSummaryLoading(true);
      try {
        const response = await fetch("/api/ai/post-submission-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalUnits: result.totalUnits,
            expectedUnits: evaluation.expectedUnits,
            issueCount: result.issueCount,
          }),
        });
        if (response.ok) {
          const body = (await response.json()) as { summary: string };
          await savePostSummaryAction(body.summary);
          router.refresh();
        }
      } finally {
        setSummaryLoading(false);
      }
    });
  };

  const errorCount = evaluation.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = evaluation.issues.filter((issue) => issue.severity === "warning").length;

  return (
    <div className="grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--oui-black)]">Your courses this semester</h2>
            <p className="mt-1 text-sm text-[var(--oui-ink)]">
              Your department expects about {offering.expectedUnits} units this semester. You have picked{" "}
              <strong>{evaluation.totalUnits}</strong> so far. Tap a course to add or remove it.
            </p>
          </div>
          <StatusPill status={registration.status} />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[var(--oui-crimson)]">
            Compulsory courses
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {coreCourses.map((course) => {
              const upper = course.code.toUpperCase();
              const completed = completedSet.has(upper);
              return (
                <CourseCard
                  key={course.code}
                  course={course}
                  selected={selectedSet.has(upper)}
                  disabled={disabled || completed}
                  disabledReason={
                    completed ? "You already passed this." : "Registration is currently closed."
                  }
                  onToggle={handleToggle}
                />
              );
            })}
          </div>
        </div>

        {electiveGroups.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[var(--oui-crimson)]">
              Choose an elective
            </h3>
            {electiveGroups.map((group) => {
              const picked = group.options.filter((course) => selectedSet.has(course.code.toUpperCase())).length;
              return (
                <div key={group.label} className="mb-6">
                  <p className="mb-3 text-sm text-[var(--oui-ink)]">
                    <span className="font-semibold text-[var(--oui-black)]">{group.label}</span> — pick{" "}
                    {group.pickCount} of the options below. You have picked {picked} so far.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.options.map((course) => (
                      <CourseCard
                        key={course.code}
                        course={course}
                        selected={selectedSet.has(course.code.toUpperCase())}
                        disabled={disabled}
                        onToggle={handleToggle}
                        showInsight
                        insightLoader={fetchInsight}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <CarryoverPicker
          carryoverCatalogue={carryoverCatalogue}
          sharedGstCatalogue={sharedGstCatalogue}
          selectedCodes={registration.selectedCodes}
          outstandingCodes={outstandingCourses}
          completedCodes={completedCourses}
          disabled={disabled}
        />
      </section>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6 shadow-[0_20px_60px_rgba(20,20,20,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            Your selection
          </p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-[var(--oui-black)]">{evaluation.totalUnits}</span>
            <span className="text-sm text-[var(--oui-ink)]">units picked</span>
          </div>
          {evaluation.expectedUnits ? (
            <p className="mt-2 text-sm text-[var(--oui-ink)]">
              Your department expects about {evaluation.expectedUnits} units this semester.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-[var(--oui-ink)]">
            Session <strong>{window.session}</strong>, Semester {window.semester} —{" "}
            <span className={window.isOpen ? "text-emerald-700" : "text-[var(--oui-crimson)]"}>
              {window.isOpen ? "registration is open" : "registration is closed"}
            </span>
            .
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || disabled}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--oui-gold)] px-5 py-3 text-sm font-semibold text-[var(--oui-black)] shadow-[0_16px_40px_rgba(196,30,58,0.08)] transition hover:bg-[var(--oui-gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {registration.status === "submitted" || registration.status === "queried"
                ? "Submit again"
                : registration.status === "approved"
                  ? "Approved — locked"
                  : "Send to my adviser"}
            </button>
            <Link
              href="/student/receipt"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--oui-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--oui-ink)] transition hover:border-[var(--oui-gold)]",
                registration.status === "draft" && "pointer-events-none opacity-60",
              )}
            >
              <FileText className="h-4 w-4" />
              Course form
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            Things to fix
          </p>
          <p className="mt-3 text-sm text-[var(--oui-ink)]">
            {errorCount === 0 && warningCount === 0
              ? "Everything looks good."
              : `${errorCount} must-fix issue${errorCount === 1 ? "" : "s"}, ${warningCount} thing${warningCount === 1 ? "" : "s"} to check.`}
          </p>
          <AnimatePresence>
            {evaluation.issues.length ? (
              <motion.ul
                key="issues"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 space-y-3"
              >
                {evaluation.issues.map((issue, index) => (
                  <li
                    key={`${issue.kind}-${issue.courseCode ?? index}`}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3 text-xs leading-6",
                      issue.severity === "error"
                        ? "border-[var(--oui-crimson)] bg-[color:color-mix(in_srgb,var(--oui-crimson)_8%,white)] text-[var(--oui-crimson-dark)]"
                        : "border-[var(--oui-border)] bg-[var(--oui-surface)] text-[var(--oui-ink)]",
                    )}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{issue.message}</span>
                  </li>
                ))}
              </motion.ul>
            ) : (
              <motion.div
                key="clean"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
              >
                All good — nothing needs your attention right now.
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {registration.status !== "draft" ? (
          <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
              <Sparkles className="h-3.5 w-3.5" /> Your registration in plain words
            </p>
            <div className="mt-3 text-sm leading-7 text-[var(--oui-ink)]">
              {summaryLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Writing your summary…
                </span>
              ) : (
                registration.postSummary ?? "A short summary of your registration will appear here after you submit."
              )}
            </div>
            {registration.adviserComment ? (
              <div className="mt-4 rounded-2xl border border-[var(--oui-border)] bg-[var(--oui-surface)] p-3 text-xs leading-6 text-[var(--oui-ink)]">
                <p className="font-semibold text-[var(--oui-black)]">Note from your adviser</p>
                <p className="mt-1">{registration.adviserComment}</p>
              </div>
            ) : null}
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function StatusPill({ status }: { status: RegistrationRecord["status"] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const styles: Record<RegistrationRecord["status"], string> = {
    draft: "bg-[var(--oui-surface)] text-[var(--oui-ink)] border-[var(--oui-border)]",
    submitted: "bg-[color:color-mix(in_srgb,var(--oui-gold)_18%,white)] text-[var(--oui-black)] border-[var(--oui-gold)]",
    approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
    queried: "bg-[color:color-mix(in_srgb,var(--oui-crimson)_10%,white)] text-[var(--oui-crimson-dark)] border-[var(--oui-crimson)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
        styles[status],
      )}
    >
      {label}
    </span>
  );
}
