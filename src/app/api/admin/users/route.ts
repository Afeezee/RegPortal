import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { createStaffAccount, listAllUsers } from "@/lib/auth/user-store";
import { hasDatabaseUrl } from "@/lib/env";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ users: [] });
  }
  const users = await listAllUsers();
  return NextResponse.json({ users });
}

const createSchema = z.object({
  fullName: z.string().min(3),
  loginId: z.string().min(3),
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(["adviser", "admin"]),
  departmentName: z.string().optional(),
  adviserLevel: z.coerce.number().int().min(100).max(500).optional(),
  title: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "Account creation requires the database to be configured." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 },
    );
  }

  try {
    const result = await createStaffAccount(parsed.data);
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
