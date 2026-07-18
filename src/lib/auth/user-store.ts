import { and, desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/db";
import {
  accountClaims,
  admins,
  advisers,
  departments,
  students,
  users,
} from "@/lib/db/schema";
import { demoUsers } from "@/lib/demo/demo-data";
import { env } from "@/lib/env";
import type { AccountStatus, AppRole } from "@/lib/types";

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
    const passwordHash = await bcrypt.hash(env.ADMIN_BOOTSTRAP_SECRET, 10);

    const [existingUser] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, env.SUPER_ADMIN_EMAIL))
      .limit(1);

    if (existingUser) {
      // Sync the stored hash if the operator rotated ADMIN_BOOTSTRAP_SECRET.
      const stillMatches = await bcrypt.compare(
        env.ADMIN_BOOTSTRAP_SECRET,
        existingUser.passwordHash,
      );
      if (!stillMatches) {
        await db
          .update(users)
          .set({
            passwordHash,
            accountStatus: "active",
            role: "admin",
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }
      return;
    }

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

// ─── Admin user management ────────────────────────────────────────────────

export type ManagedUserRecord = {
  id: string;
  name: string;
  email: string | null;
  loginId: string;
  role: AppRole;
  accountStatus: AccountStatus;
  matricNumber: string | null;
  departmentName: string | null;
  currentLevel: number | null;
  adviserLevel: number | null;
  createdAt: string;
};

export async function listAllUsers(): Promise<ManagedUserRecord[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      loginId: users.loginId,
      role: users.role,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
      matricNumber: students.matricNumber,
      studentLevel: students.currentLevel,
      studentDeptId: students.departmentId,
      adviserLevel: advisers.level,
      adviserDeptId: advisers.departmentId,
    })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(advisers, eq(advisers.userId, users.id))
    .orderBy(desc(users.createdAt));

  const deptIds = new Set<string>();
  for (const row of rows) {
    if (row.studentDeptId) deptIds.add(row.studentDeptId);
    if (row.adviserDeptId) deptIds.add(row.adviserDeptId);
  }

  const deptNames = new Map<string, string>();
  if (deptIds.size > 0) {
    const deptRows = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments);
    for (const d of deptRows) deptNames.set(d.id, d.name);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    loginId: row.loginId,
    role: row.role,
    accountStatus: row.accountStatus,
    matricNumber: row.matricNumber,
    departmentName:
      (row.studentDeptId && deptNames.get(row.studentDeptId)) ||
      (row.adviserDeptId && deptNames.get(row.adviserDeptId)) ||
      null,
    currentLevel: row.studentLevel,
    adviserLevel: row.adviserLevel,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type CreateStaffInput = {
  fullName: string;
  loginId: string;
  email: string;
  password: string;
  role: "adviser" | "admin";
  departmentName?: string;
  adviserLevel?: number;
  title?: string;
};

export async function createStaffAccount(input: CreateStaffInput) {
  const db = getDb();
  if (!db) throw new Error("A database connection is required.");

  const loginId = input.loginId.trim();
  const email = input.email.trim().toLowerCase();
  const name = input.fullName.trim();
  if (!loginId || !email || !name || !input.password) {
    throw new Error("Name, username, email, and password are all required.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const [byLogin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.loginId, loginId))
    .limit(1);
  if (byLogin) throw new Error("That username is already taken.");

  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (byEmail) throw new Error("An account with that email already exists.");

  let departmentId: string | null = null;
  if (input.role === "adviser") {
    if (!input.departmentName) {
      throw new Error("Advisers must be assigned to a department.");
    }
    if (!input.adviserLevel) {
      throw new Error("Advisers must be assigned to a level.");
    }
    const [dept] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.name, input.departmentName))
      .limit(1);
    if (!dept) throw new Error("Unknown department — pick one from the list.");
    departmentId = dept.id;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      loginId,
      email,
      name,
      role: input.role,
      accountStatus: "active",
      passwordHash,
      verifiedAt: new Date(),
    })
    .returning({ id: users.id });

  if (!created) throw new Error("Failed to create the account.");

  if (input.role === "adviser" && departmentId) {
    await db
      .insert(advisers)
      .values({
        userId: created.id,
        departmentId,
        level: input.adviserLevel!,
      })
      .onConflictDoNothing();
  }

  if (input.role === "admin") {
    await db
      .insert(admins)
      .values({ userId: created.id, title: input.title?.trim() || "Administrator" })
      .onConflictDoNothing();
  }

  return { id: created.id };
}

export async function updateUserStatus(userId: string, status: AccountStatus) {
  const db = getDb();
  if (!db) throw new Error("A database connection is required.");
  await db
    .update(users)
    .set({ accountStatus: status, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return { ok: true };
}

export async function deleteUser(userId: string, currentAdminId: string) {
  const db = getDb();
  if (!db) throw new Error("A database connection is required.");
  if (userId === currentAdminId) {
    throw new Error("You cannot delete your own account.");
  }
  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) throw new Error("Account not found.");
  if (env.SUPER_ADMIN_EMAIL && target.email === env.SUPER_ADMIN_EMAIL) {
    throw new Error("The super-admin account cannot be deleted.");
  }
  await db.delete(users).where(eq(users.id, userId));
  return { ok: true };
}
