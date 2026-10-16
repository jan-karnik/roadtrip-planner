"use client";

import { Printer } from "lucide-react";
import { CopyBlock } from "./CopyBlock";
import { t } from "@/lib/i18n";

export function ExportActions({ text }: { text: string }) {
  return (
    <div className="export-print-area flex flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-base-600 bg-base-800 px-3 text-sm font-medium text-slate-200 transition hover:bg-base-700 active:bg-base-600"
        >
          <Printer className="h-4 w-4" />
          {t.exportPage.print}
        </button>
      </div>
      <CopyBlock text={text} />
    </div>
  );
}
