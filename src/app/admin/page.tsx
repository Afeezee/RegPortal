import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { auth } from "@/auth";
import { AdminPanel } from "@/components/portal/admin-panel";
import { CatalogueBrowser, type CatalogueRow } from "@/components/portal/catalogue-browser";
import { ClaimsPanel } from "@/components/portal/claims-panel";
import { CurriculumEditor } from "@/components/portal/curriculum-editor";
import { PortalShell } from "@/components/portal/shell";
import { getAdminDashboardData } from "@/lib/portal/dashboard";
import { getFullCatalogue } from "@/lib/portal/catalogue";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect(`/${session.user.role}`);

  const dashboard = await getAdminDashboardData();
  if (!dashboard) redirect("/login");

  const catalogue = getFullCatalogue();
  const rows: CatalogueRow[] = [];
  const grouping = new Map<string, CatalogueRow>();
  for (const entry of catalogue) {
    const key = `${entry.department}::${entry.level}::${entry.semester}`;
    if (!grouping.has(key)) {
      grouping.set(key, {
        college: "",
        department: entry.department,
        level: entry.level,
        semester: entry.semester,
        expectedUnits: null,
        courses: [],
      });
    }
    grouping.get(key)!.courses.push(entry);
  }
  for (const row of grouping.values()) rows.push(row);

  const departments = Array.from(new Set(catalogue.map((entry) => entry.department))).sort();

  return (
    <PortalShell
      title="Admin dashboard"
      subtitle="Manage the course catalogue, open or close registration, and export submissions."
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-[var(--oui-border)] bg-white/70 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
              Accounts
            </p>
            <p className="mt-1 text-sm text-[var(--oui-ink)]">
              Register staff and administrators, or suspend accounts that should no longer sign in.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--oui-black)] px-4 py-2 text-sm font-semibold text-[var(--oui-gold)]"
          >
            <Users className="h-4 w-4" />
            Open account management
          </Link>
        </div>
        <ClaimsPanel claims={dashboard.pendingClaims} />
        <AdminPanel
          window={dashboard.window}
          registrations={dashboard.registrations}
          counts={dashboard.counts}
        />
        <CurriculumEditor
          departments={departments}
          overrides={dashboard.curriculumOverrides}
          catalogue={catalogue}
        />
        <CatalogueBrowser rows={rows} />
      </div>
    </PortalShell>
  );
}
