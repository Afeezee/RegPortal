"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2, MessageSquareWarning } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { adviserDecisionAction } from "@/lib/portal/actions";
import type { RegistrationRecord } from "@/lib/registration/store";
import { cn } from "@/lib/utils";

type Props = {
  submissions: RegistrationRecord[];
  adviserLevel: number;
};

export function AdviserPanel({ submissions, adviserLevel }: Props) {
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const advisees = submissions.filter((record) => record.level === adviserLevel);

  const decide = (action: "approved" | "queried") => {
    startTransition(async () => {
      const result = await adviserDecisionAction(action, comment);
      if (result.ok) {
        toast.success(action === "approved" ? "Registration approved." : "Registration queried.");
        setComment("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not save decision.");
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
          Advisees ({advisees.length})
        </p>
        <div className="mt-4 space-y-3">
          {advisees.length === 0 ? (
            <p className="text-sm text-[var(--oui-ink)]">
              No advisees registered at {adviserLevel} Level yet.
            </p>
          ) : (
            advisees.map((record) => (
              <motion.article
                layout
                key={record.studentLoginId}
                className={cn(
                  "rounded-2xl border p-4",
                  record.status === "approved"
                    ? "border-emerald-200 bg-emerald-50/60"
                    : record.status === "queried"
                      ? "border-[var(--oui-crimson)] bg-[color:color-mix(in_srgb,var(--oui-crimson)_10%,white)]"
                      : "border-[var(--oui-border)] bg-white",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--oui-black)]">{record.studentName}</p>
                    <p className="text-xs text-[var(--oui-ink)]">
                      {record.matricNumber} · {record.departmentName}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[var(--oui-ink)]">
                    <p className="uppercase tracking-[0.2em]">{record.status}</p>
                    <p>{record.totalUnits} units</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[var(--oui-ink)]">
                  Selected: {record.selectedCodes.join(", ") || "—"}
                </p>
                {record.adviserComment ? (
                  <p className="mt-2 text-xs italic text-[var(--oui-ink)]">
                    “{record.adviserComment}”
                  </p>
                ) : null}
              </motion.article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
          Decision
        </p>
        <p className="mt-2 text-sm text-[var(--oui-ink)]">
          Reviewing the most recent submitted advisee. Optionally leave a note before approving or querying.
        </p>
        <label className="mt-4 block text-xs uppercase tracking-[0.22em] text-[var(--oui-ink)]">
          Comment
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="e.g. Consider swapping CPE 515 for CPE 519 given your project scope."
            className="mt-1 w-full rounded-2xl border border-[var(--oui-border)] bg-white p-3 text-sm normal-case tracking-normal text-[var(--oui-ink)] outline-none focus:border-[var(--oui-gold)]"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => decide("approved")}
            disabled={pending || advisees.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--oui-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--oui-black)] transition hover:bg-[var(--oui-gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve
          </button>
          <button
            type="button"
            onClick={() => decide("queried")}
            disabled={pending || advisees.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--oui-crimson)] px-5 py-2.5 text-sm font-semibold text-[var(--oui-crimson-dark)] transition hover:bg-[var(--oui-crimson)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MessageSquareWarning className="h-4 w-4" />
            Query
          </button>
        </div>
      </section>
    </div>
  );
}
