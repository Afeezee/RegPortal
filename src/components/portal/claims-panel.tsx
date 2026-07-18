"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { PendingClaimRecord } from "@/lib/portal/dashboard";

type Props = {
  claims: PendingClaimRecord[];
};

export function ClaimsPanel({ claims }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const decide = (id: string, action: "approve" | "reject") => {
    let reason = "";
    if (action === "reject") {
      const prompt = window.prompt("Reason for rejecting this account claim?");
      if (prompt === null) return;
      reason = prompt;
    }
    setPendingId(id);
    startTransition(async () => {
      const response = await fetch(`/api/admin/claims/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error ?? "Could not update claim.");
        setPendingId(null);
        return;
      }
      toast.success(action === "approve" ? "Account approved." : "Account claim rejected.");
      setPendingId(null);
      router.refresh();
    });
  };

  return (
    <motion.section
      layout
      className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            Pending accounts
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--oui-black)]">
            {claims.length} student{claims.length === 1 ? "" : "s"} waiting for verification
          </h3>
        </div>
        <p className="text-xs text-[var(--oui-ink)]">
          Approving grants portal access. Rejecting keeps the record and stops the sign-in.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            <tr className="border-b border-[var(--oui-border)]">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Matric</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Department</th>
              <th className="py-2 pr-4">Level</th>
              <th className="py-2 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--oui-ink)]">
                  No pending claims. New sign-ups will appear here.
                </td>
              </tr>
            ) : (
              claims.map((claim) => {
                const rowPending = isPending && pendingId === claim.id;
                return (
                  <tr
                    key={claim.id}
                    className="border-b border-[var(--oui-border)] text-[var(--oui-ink)]"
                  >
                    <td className="py-2 pr-4 font-semibold text-[var(--oui-black)]">
                      {claim.fullName}
                    </td>
                    <td className="py-2 pr-4">{claim.matricNumber}</td>
                    <td className="py-2 pr-4">{claim.email}</td>
                    <td className="py-2 pr-4">{claim.departmentName}</td>
                    <td className="py-2 pr-4">{claim.level}</td>
                    <td className="py-2 pr-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => decide(claim.id, "approve")}
                          disabled={rowPending}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {rowPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(claim.id, "reject")}
                          disabled={rowPending}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--oui-crimson)] px-3 py-1.5 text-xs font-semibold text-[var(--oui-crimson-dark)] hover:bg-[color:color-mix(in_srgb,var(--oui-crimson)_8%,white)] disabled:opacity-60"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
