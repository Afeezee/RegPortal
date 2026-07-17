import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

import { buildGroundedSystemPrompt } from "@/lib/ai/context";
import { buildViolationExplanation } from "@/lib/ai/fallbacks";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { hasGroqApiKey } from "@/lib/env";
import type { ConstraintIssue } from "@/lib/registration/constraints";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit("demo-violation", 30, 60_000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { issue } = (await request.json()) as { issue: ConstraintIssue };

  if (!hasGroqApiKey()) {
    return Response.json({ explanation: buildViolationExplanation(issue), source: "fallback" });
  }

  const result = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    system: buildGroundedSystemPrompt(),
    prompt: `Explain this registration issue in one short paragraph and suggest the safest fix: ${issue.message}`,
  });

  return Response.json({ explanation: result.text, source: "groq" });
}
