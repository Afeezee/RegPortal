import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.role) {
    redirect(session.user.accountStatus === "pending" ? "/pending-verification" : `/${session.user.role}`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_rgba(196,30,58,0.08),_transparent_28%),radial-gradient(circle_at_top,_rgba(255,210,5,0.22),_transparent_28%),var(--oui-surface)] px-6 py-10 sm:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/80 p-8 shadow-[0_24px_80px_rgba(20,20,20,0.08)] backdrop-blur sm:p-10">
          <Image
            src="/oui-logo.png"
            alt="Oduduwa University crest"
            width={96}
            height={96}
            className="mb-4 h-20 w-20 object-contain"
            priority
          />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
            Oduduwa University
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--oui-black)] sm:text-5xl">
            Welcome back.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--oui-ink)]">
            Sign in with your approved account to register for your courses this semester.
          </p>

          <div className="mt-8 rounded-3xl border border-[var(--oui-border)] bg-[color:color-mix(in_srgb,var(--oui-gold)_12%,white)] p-5 text-sm leading-7 text-[var(--oui-ink)]">
            <p className="font-semibold text-[var(--oui-black)]">First time here?</p>
            <p className="mt-2">
              <Link href="/signup" className="font-semibold text-[var(--oui-crimson)]">
                Create an account claim
              </Link>{" "}
              with your matric number and wait for admin verification before signing in.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(20,20,20,0.08)] backdrop-blur sm:p-10">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
