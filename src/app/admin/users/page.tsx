import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PortalShell } from "@/components/portal/shell";
import { UsersPanel } from "@/components/portal/users-panel";
import { listAllUsers } from "@/lib/auth/user-store";
import { env } from "@/lib/env";
import { getFullCatalogue } from "@/lib/portal/catalogue";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect(`/${session.user.role}`);

  const users = await listAllUsers();
  const departments = Array.from(
    new Set(getFullCatalogue().map((entry) => entry.department)),
  ).sort();

  return (
    <PortalShell
      title="Account management"
      subtitle="Register staff and admins, and control who can sign in to RegPortal."
    >
      <UsersPanel
        users={users}
        departments={departments}
        currentUserId={session.user.id}
        superAdminEmail={env.SUPER_ADMIN_EMAIL ?? null}
      />
    </PortalShell>
  );
}
