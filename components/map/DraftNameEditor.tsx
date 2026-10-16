"use client";

import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { t } from "@/lib/i18n";

export function DraftNameEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    onChange(value.trim());
    setEditing(false);
  }

  return (
    <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5 shadow-xl backdrop-blur-md">
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder={t.map.draftNamePlaceholder}
          maxLength={80}
          className="w-full bg-transparent text-sm font-medium text-white placeholder:text-white/30 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="group flex w-full items-center gap-2 text-left"
        >
          <Pencil className="h-3.5 w-3.5 shrink-0 text-white/40 transition group-hover:text-white/70" />
          <span
            className={`truncate text-sm font-medium ${
              value ? "text-white" : "text-white/30"
            }`}
          >
            {value || t.map.draftNamePlaceholder}
          </span>
        </button>
      )}
    </div>
  );
}
