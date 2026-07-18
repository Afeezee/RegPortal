import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/db";
import { accountClaims, admins, departments, students, users } from "@/lib/db/schema";
import { demoUsers } from "@/lib/demo/demo-data";
import { env } from "@/lib/env";
import type { AppRole } from "@/lib/types";

export type AuthUserRecord = {
  id: string;
  name: string;
  email: string | null;
  loginId: string;
  role: AppRole;
  accountStatus: "pending" | "active" | "suspended";
  passwordHash?: string;
  demoPassword?: string;
  matricNumber?: string | null;
  currentLevel?: number | null;
  departmentName?: string | null;
};

export type AccountClaimInput = {
  fullName: string;
  email: string;
  matricNumber: string;
  password: string;
  departmentName: string;
  currentLevel: number;
};

export type PendingClaimRecord = {
  id: string;
  fullName: string;
  email: string;
  matricNumber: string;
  departmentName: string;
  level: number;
  status: "pending" | "active" | "suspended";
  createdAt?: string;
};

let bootstrapAttempted = false;

async function ensureBootstrapAdmin() {
  if (bootstrapAttempted) return;
  const db = getDb();
  if (!db || !env.SUPER_ADMIN_EMAIL || !env.ADMIN_BOOTSTRAP_SECRET) {
    return;
  }
  bootstrapAttempted = true;

  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, env.SUPER_ADMIN_EMAIL))
      .limit(1);

    if (existingUser) {
      return;
    }

    const passwordHash = await bcrypt.hash(env.ADMIN_BOOTSTRAP_SECRET, 10);

    const [adminUser] = await db
      .insert(users)
      .values({
        loginId: env.SUPER_ADMIN_EMAIL,
        email: env.SUPER_ADMIN_EMAIL,
        name: "Super Admin",
        role: "admin",
        accountStatus: "active",
        passwordHash,
        verifiedAt: new Date(),
      })
      .returning({ id: users.id });

    if (adminUser) {
      await db
        .insert(admins)
        .values({ userId: adminUser.id, title: "Super Admin" })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("[auth] bootstrap admin failed:", error);
    bootstrapAttempted = false;
  }
}

export async function getUserByLoginId(loginId: string): Promise<AuthUserRecord | null> {
  const normalizedLoginId = loginId.trim();
  const db = getDb();

  if (!db) {
    const demoUser = demoUsers.find(
      (candidate) => candidate.loginId.toLowerCase() === normalizedLoginId.toLowerCase(),
    );

    if (!demoUser) {
      return null;
    }

    return {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      loginId: demoUser.loginId,
      role: demoUser.role,
      accountStatus: demoUser.accountStatus ?? "active",
      demoPassword: demoUser.password,
      matricNumber: demoUser.matricNumber ?? null,
      currentLevel: demoUser.currentLevel ?? null,
      departmentName: demoUser.departmentName ?? null,
    };
  }

  await ensureBootstrapAdmin();

  let userRecord;
  try {
    [userRecord] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        loginId: users.loginId,
        role: users.role,
        accountStatus: users.accountStatus,
        passwordHash: users.passwordHash,
        matricNumber: students.matricNumber,
        currentLevel: students.currentLevel,
      })
      .from(users)
      .leftJoin(students, eq(students.userId, users.id))
      .where(eq(users.loginId, normalizedLoginId))
      .limit(1);
  } catch (error) {
    console.error("[auth] user lookup failed:", error);
    return null;
  }

  if (!userRecord) {
    return null;
  }

  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    loginId: userRecord.loginId,
    role: userRecord.role,
    accountStatus: userRecord.accountStatus,
    passwordHash: userRecord.passwordHash,
    matricNumber: userRecord.matricNumber,
    currentLevel: userRecord.currentLevel,
    departmentName: null,
  };
}

export async function createAccountClaim(input: AccountClaimInput) {
  const db = getDb();
  if (!db) {
    throw new Error("A database connection is required for account signup.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedMatric = input.matricNumber.trim().toUpperCase();

  const [existingUserByEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existingUserByEmail) {
    throw new Error("An account with that email already exists.");
  }

  const [existingUserByLogin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.loginId, normalizedMatric))
    .limit(1);
  if (existingUserByLogin) {
    throw new Error("An account with that matric number already exists.");
  }

  const [existingClaim] = await db
    .select({ id: accountClaims.id })
    .from(accountClaims)
    .where(eq(accountClaims.email, normalizedEmail))
    .limit(1);
  if (existingClaim) {
    throw new Error("An account claim for that email is already pending review.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const [claim] = await db
    .insert(accountClaims)
    .values({
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      matricNumber: normalizedMatric,
      requestedRole: "student",
      departmentName: input.departmentName.trim(),
      level: input.currentLevel,
      passwordHash,
      status: "pending",
    })
    .returning({ id: accountClaims.id });

  return claim;
}

export async function listPendingAccountClaims(): Promise<PendingClaimRecord[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: accountClaims.id,
      fullName: accountClaims.fullName,
      email: accountClaims.email,
      matricNumber: accountClaims.matricNumber,
      departmentName: accountClaims.departmentName,
      level: accountClaims.level,
      status: accountClaims.status,
      createdAt: accountClaims.createdAt,
    })
    .from(accountClaims);

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function approveAccountClaim(claimId: string, adminUserId: string) {
  const db = getDb();
  if (!db) {
    throw new Error("A database connection is required for account approval.");
  }

  const [claim] = await db
    .select()
    .from(accountClaims)
    .where(eq(accountClaims.id, claimId))
    .limit(1);

  if (!claim) {
    throw new Error("Account claim not found.");
  }

  if (claim.status !== "pending") {
    throw new Error("This account claim has already been reviewed.");
  }

  const [user] = await db
    .insert(users)
    .values({
      loginId: claim.matricNumber,
      email: claim.email,
      name: claim.fullName,
      role: claim.requestedRole,
      accountStatus: "active",
      passwordHash: claim.passwordHash,
      verifiedAt: new Date(),
    })
    .returning({ id: users.id });

  if (!user) {
    throw new Error("Failed to create approved user.");
  }

  if (claim.requestedRole === "student") {
    const [dept] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.name, claim.departmentName))
      .limit(1);

    if (dept) {
      await db
        .insert(students)
        .values({
          userId: user.id,
          matricNumber: claim.matricNumber,
          departmentId: dept.id,
          currentLevel: claim.level,
          email: claim.email,
          claimedAt: new Date(),
        })
        .onConflictDoNothing();
    }
  }

  await db
    .update(accountClaims)
    .set({
      status: "active",
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
      rejectionReason: null,
    })
    .where(eq(accountClaims.id, claimId));

  return user;
}

export async function rejectAccountClaim(
  claimId: string,
  adminUserId: string,
  reason: string,
) {
  const db = getDb();
  if (!db) {
    throw new Error("A database connection is required to reject an account claim.");
  }

  const [claim] = await db
    .select({ id: accountClaims.id, status: accountClaims.status })
    .from(accountClaims)
    .where(eq(accountClaims.id, claimId))
    .limit(1);

  if (!claim) {
    throw new Error("Account claim not found.");
  }

  if (claim.status !== "pending") {
    throw new Error("This account claim has already been reviewed.");
  }

  await db
    .update(accountClaims)
    .set({
      status: "suspended",
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
      rejectionReason: reason.trim() || "No reason provided.",
    })
    .where(and(eq(accountClaims.id, claimId), eq(accountClaims.status, "pending")));

  return { ok: true };
}
