"use client";

import { motion } from "framer-motion";
import { Loader2, Plus, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toggleCourseAction } from "@/lib/portal/actions";
import type { CatalogueEntry } from "@/lib/portal/catalogue";
import { cn } from "@/lib/utils";

type Props = {
  carryoverCatalogue: CatalogueEntry[];
  sharedGstCatalogue: CatalogueEntry[];
  selectedCodes: string[];
  outstandingCodes: string[];
  completedCodes: string[];
  disabled?: boolean;
};

export function CarryoverPicker({
  carryoverCatalogue,
  sharedGstCatalogue,
  selectedCodes,
  outstandingCodes,
  completedCodes,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"outstanding" | "department" | "gst">("outstanding");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selectedSet = useMemo(
    () => new Set(selectedCodes.map((code) => code.toUpperCase())),
    [selectedCodes],
  );
  const completedSet = useMemo(
    () => new Set(completedCodes.map((code) => code.toUpperCase())),
    [completedCodes],
  );
  const outstandingSet = useMemo(
    () => new Set(outstandingCodes.map((code) => code.toUpperCase())),
    [outstandingCodes],
  );

  const source = useMemo(() => {
    const pick = (entries: CatalogueEntry[]) => {
      const seen = new Set<string>();
      const result: CatalogueEntry[] = [];
      for (const entry of entries) {
        const key = entry.code.toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(entry);
      }
      return result;
    };
    if (tab === "outstanding") {
      return pick([
        ...carryoverCatalogue.filter((entry) => outstandingSet.has(entry.code.toUpperCase())),
        ...sharedGstCatalogue.filter((entry) => outstandingSet.has(entry.code.toUpperCase())),
      ]);
    }
    if (tab === "gst") return pick(sharedGstCatalogue);
    return pick(carryoverCatalogue);
  }, [tab, carryoverCatalogue, sharedGstCatalogue, outstandingSet]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (entry) =>
        entry.code.toLowerCase().includes(q) || entry.title.toLowerCase().includes(q),
    );
  }, [query, source]);

  const add = (code: string) => {
    if (disabled) return;
    startTransition(async () => {
      const result = await toggleCourseAction(code);
      if (!result.ok) {
        toast.error(result.message ?? "Could not update.");
        return;
      }
      toast.success(selectedSet.has(code.toUpperCase()) ? `Removed ${code}.` : `Added ${code}.`);
      router.refresh();
    });
  };

  return (
    <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6 shadow-[0_16px_40px_rgba(20,20,20,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            Extra courses
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--oui-black)]">
            Retake a failed course or add a General Studies course
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--oui-ink)]">
            Any course you did not pass in a previous session can be added here. You can also add
            General Studies (GST) courses shared across the university.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--oui-ink)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code or title"
            className="w-64 rounded-full border border-[var(--oui-border)] bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--oui-gold)]"
          />
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-[var(--oui-border)] bg-white p-1 text-xs font-semibold">
        {(
          [
            { key: "outstanding", label: "Outstanding" },
            { key: "department", label: "Lower-level department courses" },
            { key: "gst", label: "General Studies (GST)" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setTab(option.key)}
            className={cn(
              "rounded-full px-3 py-1.5 transition",
              tab === option.key
                ? "bg-[var(--oui-black)] text-[var(--oui-gold)]"
                : "text-[var(--oui-ink)] hover:text-[var(--oui-black)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--oui-ink)]">
            {tab === "outstanding"
              ? "No outstanding courses on record. You are up to date."
              : "No matching courses."}
          </p>
        ) : (
          filtered.map((entry) => {
            const upper = entry.code.toUpperCase();
            const already = selectedSet.has(upper);
            const passed = completedSet.has(upper);
            const outstanding = outstandingSet.has(upper);
            return (
              <motion.article
                key={entry.code}
                layout
                className={cn(
                  "flex flex-col rounded-2xl border p-4",
                  already
                    ? "border-[var(--oui-gold)] bg-[color:color-mix(in_srgb,var(--oui-gold)_10%,white)]"
                    : outstanding
                      ? "border-[var(--oui-crimson)] bg-[color:color-mix(in_srgb,var(--oui-crimson)_6%,white)]"
                      : "border-[var(--oui-border)] bg-white",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--oui-crimson)]">
                      {entry.code}
                    </p>
                    <h4 className="mt-1 text-sm font-semibold text-[var(--oui-black)]">
                      {entry.title}
                    </h4>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--oui-ink)]">
                      {entry.level} Level · Sem {entry.semester} · {entry.creditUnits} unit
                      {entry.creditUnits === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(entry.code)}
                    disabled={disabled || passed || pending}
                    title={passed ? "Already passed" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      already
                        ? "bg-[var(--oui-black)] text-[var(--oui-gold)]"
                        : "bg-[var(--oui-gold)] text-[var(--oui-black)] hover:bg-[var(--oui-gold-soft)]",
                      (disabled || passed) && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className={cn("h-3.5 w-3.5 transition", already && "rotate-45")} />
                    )}
                    {already ? "Remove" : passed ? "Passed" : "Add"}
                  </button>
                </div>
                {outstanding ? (
                  <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--oui-crimson-dark)]">
                    Outstanding — retake required
                  </p>
                ) : null}
              </motion.article>
            );
          })
        )}
      </div>
    </section>
  );
}
