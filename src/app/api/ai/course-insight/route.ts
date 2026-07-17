import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

import { buildCourseInsight } from "@/lib/ai/fallbacks";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { hasGroqApiKey } from "@/lib/env";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit("demo-insight", 30, 60_000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { courseCode, title } = (await request.json()) as { courseCode: string; title: string };

  if (!hasGroqApiKey()) {
    return Response.json({ insight: buildCourseInsight(courseCode, title), source: "fallback" });
  }

  const result = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt: `Write a grounded 2-3 sentence elective guidance blurb for ${courseCode} ${title}. Do not invent prerequisites. Keep the tone practical for a university student deciding between electives.`,
  });

  return Response.json({ insight: result.text, source: "groq" });
}
