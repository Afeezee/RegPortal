import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { approveAccountClaim, rejectAccountClaim } from "@/lib/auth/user-store";
import { hasDatabaseUrl } from "@/lib/env";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "Account approval requires the database to be configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  let payload: { action?: string; reason?: string } = {};
  try {
    payload = await request.json();
  } catch {
    // empty body is fine — we'll default to approve
  }

  const action = payload.action === "reject" ? "reject" : "approve";

  try {
    if (action === "approve") {
      await approveAccountClaim(id, session.user.id);
    } else {
      await rejectAccountClaim(id, session.user.id, payload.reason ?? "");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the claim.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
