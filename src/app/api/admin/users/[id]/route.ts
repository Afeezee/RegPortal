import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { deleteUser, updateUserStatus } from "@/lib/auth/user-store";
import { hasDatabaseUrl } from "@/lib/env";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

const patchSchema = z.object({
  status: z.enum(["pending", "active", "suspended"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid status." },
      { status: 400 },
    );
  }

  try {
    await updateUserStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const { id } = await context.params;
  try {
    await deleteUser(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
