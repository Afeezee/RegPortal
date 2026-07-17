import type { ConstraintIssue } from "@/lib/registration/constraints";

export function IssueList({ issues }: { issues: ConstraintIssue[] }) {
  if (!issues.length) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        No constraint issues detected in the current demo selection.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, index) => (
        <article
          key={`${issue.kind}-${issue.courseCode ?? index}`}
          className="rounded-3xl border border-[var(--oui-border)] bg-white/80 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--oui-crimson)]">
            {issue.severity}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--oui-ink)]">{issue.message}</p>
        </article>
      ))}
    </div>
  );
}
