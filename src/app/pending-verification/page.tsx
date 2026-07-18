import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

export default async function PendingVerificationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.accountStatus === "active") {
    redirect(`/${session.user.role}`);
  }

  return (
    <main className="min-h-screen bg-[var(--oui-surface)] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--oui-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(20,20,20,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">Pending verification</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--oui-black)]">Your account is awaiting admin approval.</h1>
        <p className="mt-5 text-base leading-8 text-[var(--oui-ink)]">
          We have received your account claim. An administrator must verify your record before you can access the portal.
        </p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-full border border-[var(--oui-border)] px-5 py-3 text-sm font-semibold text-[var(--oui-ink)]">Sign out</button>
        </form>
      </div>
    </main>
  );
}
