import { redirect } from "next/navigation";

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
