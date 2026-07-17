import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { students, users } from "@/lib/db/schema";
import { demoUsers } from "@/lib/demo/demo-data";
import type { AppRole } from "@/lib/types";

export type AuthUserRecord = {
  id: string;
  name: string;
  email: string | null;
  loginId: string;
  role: AppRole;
  passwordHash?: string;
  demoPassword?: string;
  matricNumber?: string | null;
  currentLevel?: number | null;
  departmentName?: string | null;
};

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
      demoPassword: demoUser.password,
      matricNumber: demoUser.matricNumber ?? null,
      currentLevel: demoUser.currentLevel ?? null,
      departmentName: demoUser.departmentName ?? null,
    };
  }

  const [userRecord] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      loginId: users.loginId,
      role: users.role,
      passwordHash: users.passwordHash,
      matricNumber: students.matricNumber,
      currentLevel: students.currentLevel,
    })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .where(eq(users.loginId, normalizedLoginId))
    .limit(1);

  if (!userRecord) {
    return null;
  }

  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    loginId: userRecord.loginId,
    role: userRecord.role,
    passwordHash: userRecord.passwordHash,
    matricNumber: userRecord.matricNumber,
    currentLevel: userRecord.currentLevel,
    departmentName: null,
  };
}
