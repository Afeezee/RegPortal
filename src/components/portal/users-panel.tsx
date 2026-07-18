"use client";

import { motion } from "framer-motion";
import { Ban, CheckCircle2, Loader2, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ManagedUserRecord } from "@/lib/auth/user-store";
import { cn } from "@/lib/utils";

type Props = {
  users: ManagedUserRecord[];
  departments: string[];
  currentUserId: string;
  superAdminEmail: string | null;
};

type NewStaffState = {
  fullName: string;
  loginId: string;
  email: string;
  password: string;
  role: "adviser" | "admin";
  departmentName: string;
  adviserLevel: number;
  title: string;
};

const emptyStaff = (departments: string[]): NewStaffState => ({
  fullName: "",
  loginId: "",
  email: "",
  password: "",
  role: "adviser",
  departmentName: departments[0] ?? "",
  adviserLevel: 100,
  title: "",
});

export function UsersPanel({ users, departments, currentUserId, superAdminEmail }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "student" | "adviser" | "admin">("all");
  const [form, setForm] = useState<NewStaffState>(() => emptyStaff(departments));
  const [creating, startCreating] = useTransition();

  const filteredUsers = useMemo(() => {
    if (filter === "all") return users;
    return users.filter((u) => u.role === filter);
  }, [filter, users]);

  const runAction = async (
    userId: string,
    fn: () => Promise<Response>,
    successMsg: string,
  ) => {
    setPendingId(userId);
    startTransition(async () => {
      const response = await fn();
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error ?? "Could not update account.");
        setPendingId(null);
        return;
      }
      toast.success(successMsg);
      setPendingId(null);
      router.refresh();
    });
  };

  const setStatus = (userId: string, status: "active" | "suspended") =>
    runAction(
      userId,
      () =>
        fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      status === "active" ? "Account reactivated." : "Account suspended.",
    );

  const removeUser = (userId: string) => {
    const confirmDelete = window.confirm(
      "Delete this account permanently? This cannot be undone.",
    );
    if (!confirmDelete) return;
    runAction(
      userId,
      () => fetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
      "Account deleted.",
    );
  };

  const createAccount = () => {
    startCreating(async () => {
      const body =
        form.role === "adviser"
          ? {
              fullName: form.fullName,
              loginId: form.loginId,
              email: form.email,
              password: form.password,
              role: "adviser" as const,
              departmentName: form.departmentName,
              adviserLevel: form.adviserLevel,
            }
          : {
              fullName: form.fullName,
              loginId: form.loginId,
              email: form.email,
              password: form.password,
              role: "admin" as const,
              title: form.title || undefined,
            };

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error ?? "Could not create the account.");
        return;
      }
      toast.success(
        `${form.role === "adviser" ? "Staff" : "Admin"} account created. They can sign in now.`,
      );
      setForm(emptyStaff(departments));
      router.refresh();
    });
  };

  const statusBadge = (status: string) => {
    const tone =
      status === "active"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
        : status === "pending"
          ? "bg-[color:color-mix(in_srgb,var(--oui-gold)_18%,white)] text-[var(--oui-black)] border-[color:color-mix(in_srgb,var(--oui-gold)_60%,white)]"
          : "bg-[color:color-mix(in_srgb,var(--oui-crimson)_10%,white)] text-[var(--oui-crimson-dark)] border-[color:color-mix(in_srgb,var(--oui-crimson)_30%,white)]";
    return (
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
          tone,
        )}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <motion.section
        layout
        className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
              Register new staff or admin
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--oui-black)]">
              Create a sign-in account
            </h3>
            <p className="mt-1 text-sm text-[var(--oui-ink)]">
              Give the person their username and password after saving — they can sign in immediately.
            </p>
          </div>
          <UserPlus className="h-6 w-6 text-[var(--oui-crimson)]" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Role
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "adviser" | "admin" })
              }
              className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
            >
              <option value="adviser">Staff (Adviser)</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Full name
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Dr. Adepoju Balogun"
              className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Username (sign-in ID)
            <input
              value={form.loginId}
              onChange={(e) => setForm({ ...form, loginId: e.target.value })}
              placeholder={form.role === "adviser" ? "adviser.cpe.400" : "admin.jane"}
              className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Email
            <input
              value={form.email}
              type="email"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@oui.edu.ng"
              className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
            Starting password
            <input
              value={form.password}
              type="text"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)] font-mono"
            />
          </label>
          {form.role === "adviser" ? (
            <>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
                Department
                <select
                  value={form.departmentName}
                  onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
                  className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
                Advisee level
                <select
                  value={form.adviserLevel}
                  onChange={(e) =>
                    setForm({ ...form, adviserLevel: Number(e.target.value) })
                  }
                  className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
                >
                  {[100, 200, 300, 400, 500].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl} Level
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
              Title (optional)
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Exam Officer"
                className="mt-1 block w-full rounded-2xl border border-[var(--oui-border)] bg-white px-3 py-2 text-sm text-[var(--oui-ink)] normal-case tracking-normal outline-none focus:border-[var(--oui-gold)]"
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={createAccount}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--oui-gold)] px-5 py-2 text-sm font-semibold text-[var(--oui-black)] transition hover:bg-[var(--oui-gold-soft)] disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Create account
          </button>
        </div>
      </motion.section>

      <motion.section
        layout
        className="rounded-[2rem] border border-[var(--oui-border)] bg-white/85 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--oui-crimson)]">
              All accounts
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--oui-black)]">
              {users.length} account{users.length === 1 ? "" : "s"}
            </h3>
          </div>
          <div className="flex gap-2">
            {(["all", "student", "adviser", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilter(r)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]",
                  filter === r
                    ? "border-[var(--oui-black)] bg-[var(--oui-black)] text-[var(--oui-gold)]"
                    : "border-[var(--oui-border)] text-[var(--oui-ink)] hover:border-[var(--oui-gold)]",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-[var(--oui-ink)]">
              <tr className="border-b border-[var(--oui-border)]">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Details</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[var(--oui-ink)]">
                    No accounts to show yet.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const rowPending = isPending && pendingId === user.id;
                  const isSelf = user.id === currentUserId;
                  const isSuperAdmin =
                    !!superAdminEmail && user.email === superAdminEmail;
                  const detail =
                    user.role === "student"
                      ? `${user.matricNumber ?? "—"} · ${user.departmentName ?? "—"} · ${user.currentLevel ?? "—"}L`
                      : user.role === "adviser"
                        ? `${user.departmentName ?? "—"} · ${user.adviserLevel ?? "—"}L`
                        : "Portal administrator";
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--oui-border)] text-[var(--oui-ink)]"
                    >
                      <td className="py-2 pr-4 font-semibold text-[var(--oui-black)]">
                        {user.name}
                        {isSelf ? (
                          <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-[var(--oui-crimson)]">
                            you
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{user.loginId}</td>
                      <td className="py-2 pr-4">{user.email ?? "—"}</td>
                      <td className="py-2 pr-4 uppercase text-xs tracking-[0.18em]">
                        {user.role}
                      </td>
                      <td className="py-2 pr-4">{detail}</td>
                      <td className="py-2 pr-4">{statusBadge(user.accountStatus)}</td>
                      <td className="py-2 pr-4 text-right">
                        <div className="inline-flex gap-2">
                          {user.accountStatus === "active" ? (
                            <button
                              type="button"
                              onClick={() => setStatus(user.id, "suspended")}
                              disabled={rowPending || isSelf || isSuperAdmin}
                              className="inline-flex items-center gap-1 rounded-full border border-[var(--oui-crimson)] px-3 py-1 text-xs font-semibold text-[var(--oui-crimson-dark)] hover:bg-[color:color-mix(in_srgb,var(--oui-crimson)_8%,white)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {rowPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Ban className="h-3.5 w-3.5" />
                              )}
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatus(user.id, "active")}
                              disabled={rowPending}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              {rowPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Activate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeUser(user.id)}
                            disabled={rowPending || isSelf || isSuperAdmin}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--oui-border)] px-3 py-1 text-xs font-semibold text-[var(--oui-ink)] hover:border-[var(--oui-crimson)] hover:text-[var(--oui-crimson-dark)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}
