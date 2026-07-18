import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listPendingAccountClaims } from "@/lib/auth/user-store";
import { hasDatabaseUrl } from "@/lib/env";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ claims: [] });
  }

  const claims = await listPendingAccountClaims();
  return NextResponse.json({ claims });
}
