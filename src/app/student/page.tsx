import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AssistantPanel } from "@/components/portal/assistant-panel";
import { RegistrationBoard } from "@/components/portal/registration-board";
import { PortalShell } from "@/components/portal/shell";
import { getStudentDashboardData } from "@/lib/portal/dashboard";

export default async function StudentPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect(`/${session.user.role}`);
  }

  const dashboard = await getStudentDashboardData();

  if (!dashboard) {
    redirect("/login");
  }

  return (
    <PortalShell
      title={`Welcome, ${dashboard.student.name.split(" ")[0]}`}
      subtitle={`${dashboard.student.departmentName} · ${dashboard.summary.heading} · Matric No ${dashboard.student.matricNumber}`}
    >
      <RegistrationBoard
        offering={dashboard.currentOffering}
        coreCourses={dashboard.currentOffering.courses}
        electiveGroups={dashboard.electiveGroups}
        registration={dashboard.registration}
        window={dashboard.window}
        evaluation={{
          totalUnits: dashboard.evaluation.totalUnits,
          expectedUnits: dashboard.evaluation.expectedUnits,
          issues: dashboard.evaluation.issues,
        }}
        completedCourses={dashboard.completedCourses}
        outstandingCourses={dashboard.outstandingCourses}
        carryoverCatalogue={dashboard.carryoverCatalogue}
        sharedGstCatalogue={dashboard.sharedGstCatalogue}
      />

      <div className="mt-10">
        <AssistantPanel />
      </div>
    </PortalShell>
  );
}
