"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--oui-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--oui-black)] transition hover:bg-[var(--oui-gold-soft)]"
    >
      <Printer className="h-4 w-4" />
      Print / Save PDF
    </button>
  );
}
