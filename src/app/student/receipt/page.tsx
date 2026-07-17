import Image from "next/image";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getStudentDashboardData } from "@/lib/portal/dashboard";
import { PrintButton } from "@/components/portal/print-button";

export const metadata = {
  title: "Course Registration Form · RegPortal",
};

export default async function ReceiptPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "student") redirect(`/${session.user.role}`);

  const dashboard = await getStudentDashboardData();
  if (!dashboard) redirect("/login");

  const { student, currentOffering, registration, evaluation, window } = dashboard;
  const selectedCourses = [
    ...currentOffering.courses,
    ...currentOffering.courseGroups.flatMap((group) => group.options),
  ].filter((course) =>
    registration.selectedCodes.some((code) => code.toUpperCase() === course.code.toUpperCase()),
  );

  const submittedAt = registration.submittedAt
    ? new Date(registration.submittedAt).toLocaleString()
    : "—";

  return (
    <main className="mx-auto max-w-4xl bg-white px-8 py-10 text-[var(--oui-ink)] print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a href="/student" className="text-sm text-[var(--oui-crimson)] hover:underline">
          ← Back to dashboard
        </a>
        <PrintButton />
      </div>

      <article className="rounded-3xl border border-[var(--oui-border)] bg-white p-10 shadow-[0_20px_60px_rgba(20,20,20,0.05)] print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b border-[var(--oui-border)] pb-6">
          <div className="flex items-start gap-4">
            <Image
              src="/oui-logo.png"
              alt="Oduduwa University crest"
              width={72}
              height={72}
              className="h-16 w-16 shrink-0 object-contain"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--oui-crimson)]">
                Oduduwa University, Ipetumodu
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--oui-black)]">
                Student Course Registration Form
              </h1>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--oui-ink)]">
                Session {window.session} · Semester {window.semester}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-[var(--oui-ink)]">
            <p>Status: <strong className="uppercase">{registration.status}</strong></p>
            <p>Submitted: {submittedAt}</p>
            {registration.approvedAt ? (
              <p>Approved: {new Date(registration.approvedAt).toLocaleString()}</p>
            ) : null}
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--oui-crimson)]">Student</p>
            <p className="mt-1 text-lg font-semibold text-[var(--oui-black)]">{student.name}</p>
            <p className="text-sm">{student.matricNumber}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--oui-crimson)]">Department / Level</p>
            <p className="mt-1 text-lg font-semibold text-[var(--oui-black)]">{student.departmentName}</p>
            <p className="text-sm">{student.currentLevel} Level</p>
          </div>
        </section>

        <section className="mt-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--oui-black)] text-left uppercase tracking-[0.18em] text-xs text-[var(--oui-black)]">
                <th className="py-2">S/N</th>
                <th className="py-2">Code</th>
                <th className="py-2">Title</th>
                <th className="py-2">Type</th>
                <th className="py-2 text-right">Units</th>
              </tr>
            </thead>
            <tbody>
              {selectedCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--oui-ink)]">
                    No courses selected.
                  </td>
                </tr>
              ) : (
                selectedCourses.map((course, index) => (
                  <tr key={course.code} className="border-b border-[var(--oui-border)]">
                    <td className="py-2">{index + 1}</td>
                    <td className="py-2 font-semibold text-[var(--oui-black)]">{course.code}</td>
                    <td className="py-2">{course.title}</td>
                    <td className="py-2 uppercase text-xs tracking-[0.18em]">{course.courseType}</td>
                    <td className="py-2 text-right">{course.creditUnits}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--oui-black)] text-sm font-semibold text-[var(--oui-black)]">
                <td colSpan={4} className="py-3">
                  Total credit units
                </td>
                <td className="py-3 text-right">{evaluation.totalUnits}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {registration.postSummary ? (
          <section className="mt-8 rounded-2xl border border-[var(--oui-border)] bg-[var(--oui-surface)] p-4 text-sm leading-6 text-[var(--oui-ink)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--oui-crimson)]">AI summary</p>
            <p className="mt-2">{registration.postSummary}</p>
          </section>
        ) : null}

        {registration.adviserComment ? (
          <section className="mt-6 rounded-2xl border border-[var(--oui-border)] bg-[var(--oui-surface)] p-4 text-sm leading-6 text-[var(--oui-ink)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--oui-crimson)]">Adviser note</p>
            <p className="mt-2">{registration.adviserComment}</p>
          </section>
        ) : null}

        <section className="mt-12 grid gap-8 sm:grid-cols-3 text-xs text-[var(--oui-ink)]">
          {[
            { label: "Student signature", name: student.name },
            { label: "Level Adviser", name: "____________________" },
            { label: "Head of Department", name: "____________________" },
          ].map((signatory) => (
            <div key={signatory.label}>
              <div className="h-10 border-b border-[var(--oui-black)]" />
              <p className="mt-2 font-semibold text-[var(--oui-black)]">{signatory.label}</p>
              <p>{signatory.name}</p>
            </div>
          ))}
        </section>
      </article>
    </main>
  );
}
