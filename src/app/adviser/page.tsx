import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdviserPanel } from "@/components/portal/adviser-panel";
import { PortalShell } from "@/components/portal/shell";
import { getAdviserDashboardData } from "@/lib/portal/dashboard";

export default async function AdviserPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "adviser") redirect(`/${session.user.role}`);

  const dashboard = await getAdviserDashboardData();
  if (!dashboard) redirect("/login");

  return (
    <PortalShell
      title="Adviser Dashboard"
      subtitle={`Review advisee registrations for ${dashboard.adviser.level} Level and record approvals or queries.`}
    >
      <AdviserPanel submissions={dashboard.submissions} adviserLevel={dashboard.adviser.level} />
    </PortalShell>
  );
}
