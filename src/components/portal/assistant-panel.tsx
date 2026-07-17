"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function AssistantPanel() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  return (
    <section className="rounded-[2rem] border border-[var(--oui-border)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(20,20,20,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--oui-crimson)]">
            Ask a question
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--oui-black)]">
            Not sure about a course? Just ask.
          </h2>
        </div>
        <span className="rounded-full bg-[color:color-mix(in_srgb,var(--oui-gold)_18%,white)] px-3 py-1 text-xs font-semibold text-[var(--oui-black)]">
          {status}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--oui-border)] p-4 text-sm leading-7 text-[var(--oui-ink)]">
            You can ask things like &quot;Should I take CPE 515 or CPE 519?&quot; or &quot;Do I need CPE 304 before CPE 411?&quot;. Your answer will use your real records.
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className={message.role === "user" ? "ml-auto max-w-[85%] rounded-3xl bg-[var(--oui-black)] px-4 py-3 text-sm leading-7 text-white" : "max-w-[90%] rounded-3xl border border-[var(--oui-border)] bg-[var(--oui-surface)] px-4 py-3 text-sm leading-7 text-[var(--oui-ink)]"}
          >
            {message.parts
              .filter((part) => part.type === "text")
              .map((part, index) => (
                <p key={`${message.id}-${index}`}>{part.text}</p>
              ))}
          </article>
        ))}
      </div>

      <form
        className="mt-5 flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) {
            return;
          }
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="flex-1 rounded-full border border-[var(--oui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--oui-gold)]"
          placeholder="Can I take CPE 411 without CPE 304?"
        />
        <button className="rounded-full bg-[var(--oui-gold)] px-5 py-3 text-sm font-semibold text-[var(--oui-black)]">
          Send
        </button>
      </form>
    </section>
  );
}
