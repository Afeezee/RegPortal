"use client";

import { motion } from "framer-motion";
import { Check, Info, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { ParsedCourse } from "@/lib/handbook/types";
import { cn } from "@/lib/utils";

export type CourseCardProps = {
  course: ParsedCourse;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onToggle?: (code: string) => Promise<void> | void;
  showInsight?: boolean;
  insightLoader?: (code: string, title: string) => Promise<string>;
};

export function CourseCard({
  course,
  selected = false,
  disabled = false,
  disabledReason,
  onToggle,
  showInsight = false,
  insightLoader,
}: CourseCardProps) {
  const [pending, startTransition] = useTransition();
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const handleToggle = () => {
    if (disabled || !onToggle) return;
    startTransition(async () => {
      await onToggle(course.code);
    });
  };

  const handleInsight = async () => {
    if (!insightLoader || insight || insightLoading) return;
    setInsightLoading(true);
    try {
      const result = await insightLoader(course.code, course.title);
      setInsight(result);
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      whileHover={{ y: onToggle && !disabled ? -2 : 0 }}
      className={cn(
        "group relative flex flex-col rounded-3xl border bg-white/80 p-5 text-left shadow-[0_16px_40px_rgba(20,20,20,0.04)] transition-colors",
        selected
          ? "border-[var(--oui-gold)] bg-[color:color-mix(in_srgb,var(--oui-gold)_10%,white)]"
          : "border-[var(--oui-border)]",
        disabled && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || !onToggle || pending}
        title={disabled ? disabledReason : undefined}
        className={cn(
          "flex items-start justify-between gap-4 text-left",
          onToggle && !disabled ? "cursor-pointer" : "cursor-default",
        )}
      >
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--oui-crimson)]">
            {course.code}
          </p>
          <h3 className="mt-2 text-base font-semibold text-[var(--oui-black)]">{course.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-[color:color-mix(in_srgb,var(--oui-gold)_18%,white)] px-3 py-1 text-xs font-semibold text-[var(--oui-black)]">
            {course.creditUnits} unit{course.creditUnits === 1 ? "" : "s"}
          </span>
          {onToggle ? (
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border transition",
                selected
                  ? "border-[var(--oui-black)] bg-[var(--oui-black)] text-[var(--oui-gold)]"
                  : "border-[var(--oui-border)] bg-white text-transparent",
              )}
              aria-hidden
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--oui-ink)]" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
          ) : null}
        </div>
      </button>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--oui-ink)]">
        <span className="rounded-full border border-[var(--oui-border)] px-3 py-1 uppercase tracking-[0.2em]">
          {course.courseType}
        </span>
        {course.prerequisites.map((prerequisite) => (
          <span key={prerequisite} className="rounded-full border border-[var(--oui-border)] px-3 py-1">
            Pre-req {prerequisite}
          </span>
        ))}
        {course.isZeroUnit ? (
          <span className="rounded-full border border-[var(--oui-crimson)] px-3 py-1 text-[var(--oui-crimson)]">
            zero-unit
          </span>
        ) : null}
      </div>

      {showInsight && insightLoader ? (
        <div className="mt-4 border-t border-dashed border-[var(--oui-border)] pt-3 text-xs">
          {insight ? (
            <p className="leading-6 text-[var(--oui-ink)]">{insight}</p>
          ) : (
            <button
              type="button"
              onClick={handleInsight}
              disabled={insightLoading}
              className="inline-flex items-center gap-2 text-[var(--oui-crimson-dark)] hover:underline"
            >
              {insightLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Info className="h-3.5 w-3.5" />}
              {insightLoading ? "Fetching insight..." : "Show AI insight"}
            </button>
          )}
        </div>
      ) : null}
    </motion.article>
  );
}
