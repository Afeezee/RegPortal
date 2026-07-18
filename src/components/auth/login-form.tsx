"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/student";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const loginId = String(formData.get("loginId") ?? "");
        const password = String(formData.get("password") ?? "");

        startTransition(async () => {
          const response = await signIn("credentials", {
            loginId,
            password,
            redirect: false,
            callbackUrl,
          });

          if (response?.error) {
            setError("Login failed.");
            return;
          }

          router.push(response?.url ?? callbackUrl);
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--oui-black)]" htmlFor="loginId">
          Matric number, staff username, or admin email
        </label>
        <input
          id="loginId"
          name="loginId"
          required
          className="w-full rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-[var(--oui-gold)]"
          placeholder="U/17/CE/0285 or you@oui.edu.ng"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--oui-black)]" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-[var(--oui-gold)]"
          placeholder="Enter your password"
        />
      </div>

      {error ? (
        <p className="text-sm text-[var(--oui-crimson)]">
          That did not work. Check your matric number and password, or create an account claim.
        </p>
      ) : null}

      <p className="text-sm text-[var(--oui-ink)]">
        New student? <Link href="/signup" className="font-semibold text-[var(--oui-crimson)]">Create an account claim</Link> for admin verification.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--oui-gold)] px-6 py-3 text-sm font-semibold text-[var(--oui-black)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
