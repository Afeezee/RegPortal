import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { buildFallbackChatReply } from "@/lib/ai/fallbacks";
import { buildGroundedSystemPrompt } from "@/lib/ai/context";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { hasGroqApiKey } from "@/lib/env";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit("demo-chat", 20, 60_000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { messages } = (await request.json()) as { messages: UIMessage[] };

  if (!hasGroqApiKey()) {
    const lastUserText = messages.at(-1)?.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ");

    return new Response(buildFallbackChatReply(lastUserText ?? ""), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: buildGroundedSystemPrompt(),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
