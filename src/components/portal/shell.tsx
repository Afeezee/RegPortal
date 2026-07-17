import Image from "next/image";
import Link from "next/link";

import { signOut } from "@/auth";

export function PortalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,210,5,0.16),_transparent_24%),linear-gradient(180deg,_#fffef9_0%,_var(--oui-surface)_100%)] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[var(--oui-border)] bg-white/80 p-6 shadow-[0_24px_70px_rgba(20,20,20,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--oui-border)] bg-white p-1"
              aria-label="Oduduwa University home"
            >
              <Image
                src="/oui-logo.png"
                alt="Oduduwa University crest"
                width={64}
                height={64}
                className="h-14 w-14 object-contain"
                priority
              />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
                RegPortal · Oduduwa University
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--oui-black)]">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--oui-ink)]">{subtitle}</p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="rounded-full border border-[var(--oui-border)] px-5 py-3 text-sm font-semibold text-[var(--oui-ink)] hover:border-[var(--oui-gold)] hover:text-[var(--oui-black)]">
              Sign out
            </button>
          </form>
        </header>
        <section className="mt-8">{children}</section>
      </div>
    </main>
  );
}
