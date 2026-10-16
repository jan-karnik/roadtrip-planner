"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { t } from "@/lib/i18n";

/** A plain-text block with a one-tap copy button. `navigator.clipboard` needs
 *  a secure context (https or localhost) — falls back to a manual select via
 *  the underlying `<textarea>` if it's unavailable or denied. */
export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/denied — the textarea below is still
      // manually selectable, so this is a silent no-op.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-base-900 transition hover:bg-accent/90 active:bg-accent/80"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              {t.exportPage.copied}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {t.exportPage.copy}
            </>
          )}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        rows={Math.min(30, text.split("\n").length + 1)}
        className="w-full resize-y rounded-xl border border-base-700 bg-base-800 p-4 font-mono text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
    </div>
  );
}
