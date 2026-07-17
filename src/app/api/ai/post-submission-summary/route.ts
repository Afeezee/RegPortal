import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

import { buildSubmissionSummary } from "@/lib/ai/fallbacks";
import { buildGroundedSystemPrompt } from "@/lib/ai/context";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { hasGroqApiKey } from "@/lib/env";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit("demo-summary", 30, 60_000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { totalUnits, expectedUnits, issueCount } = (await request.json()) as {
    totalUnits: number;
    expectedUnits: number | null;
    issueCount: number;
  };

  if (!hasGroqApiKey()) {
    return Response.json({
      summary: buildSubmissionSummary(totalUnits, expectedUnits, issueCount),
      source: "fallback",
    });
  }

  const result = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    system: buildGroundedSystemPrompt(),
    prompt: `Summarize this registration after submission. Total units: ${totalUnits}. Expected units: ${expectedUnits}. Reported issues: ${issueCount}. Keep it concise and plain-language.`,
  });

  return Response.json({ summary: result.text, source: "groq" });
}
