import { NextResponse } from "next/server";

import { createAccountClaim } from "@/lib/auth/user-store";
import { signupSchema } from "@/lib/auth/signup";
import { hasDatabaseUrl } from "@/lib/env";

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "Sign-up is unavailable until the database is configured." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Please check the details you entered." },
      { status: 400 },
    );
  }

  try {
    const claim = await createAccountClaim(parsed.data);
    return NextResponse.json({ ok: true, claimId: claim?.id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not submit your account claim.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
