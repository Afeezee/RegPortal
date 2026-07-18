"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SignupForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: formData.get("fullName"),
              email: formData.get("email"),
              matricNumber: formData.get("matricNumber"),
              departmentName: formData.get("departmentName"),
              currentLevel: formData.get("currentLevel"),
              password: formData.get("password"),
            }),
          });

          const payload = await response.json();
          if (!response.ok) {
            setError(payload.error ?? "Could not submit account claim.");
            return;
          }

          setMessage("Account claim submitted. You can sign in after admin verification.");
          event.currentTarget.reset();
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="fullName" required placeholder="Full name" className="rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--oui-gold)]" />
        <input name="email" type="email" required placeholder="Email address" className="rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--oui-gold)]" />
        <input name="matricNumber" required placeholder="Matric number" className="rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--oui-gold)]" />
        <input name="departmentName" required placeholder="Department" className="rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--oui-gold)]" />
        <select name="currentLevel" required className="rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--oui-gold)]">
          <option value="100">100 Level</option>
          <option value="200">200 Level</option>
          <option value="300">300 Level</option>
          <option value="400">400 Level</option>
          <option value="500">500 Level</option>
        </select>
        <input name="password" type="password" required placeholder="Create password" className="rounded-2xl border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--oui-gold)]" />
      </div>

      {error ? <p className="text-sm text-[var(--oui-crimson)]">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <button disabled={isPending} className="inline-flex w-full items-center justify-center rounded-full bg-[var(--oui-gold)] px-6 py-3 text-sm font-semibold text-[var(--oui-black)] disabled:opacity-60">
        {isPending ? "Submitting..." : "Submit account claim"}
      </button>

      <p className="text-sm text-[var(--oui-ink)]">
        Already verified? <Link href="/login" className="font-semibold text-[var(--oui-crimson)]">Sign in</Link>
      </p>
    </form>
  );
}
