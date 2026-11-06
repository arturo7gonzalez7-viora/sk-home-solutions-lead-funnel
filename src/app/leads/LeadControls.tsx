"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLead } from "./actions";
import { STATUSES } from "@/lib/lead-meta";

const STATUS_STYLES: Record<string, string> = {
  new: "border-gold/60 text-gold-light",
  contacted: "border-sky-400/40 text-sky-200",
  offer_sent: "border-violet-400/40 text-violet-200",
  under_contract: "border-emerald-400/40 text-emerald-200",
  closed: "border-emerald-400/70 bg-emerald-400/10 text-emerald-100",
  dead: "border-bone/15 text-bone/40",
};

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        start(async () => {
          await updateLead(id, { status: next });
          router.refresh();
        });
      }}
      className={`cursor-pointer rounded-full border bg-eclipse px-3 py-1 text-xs tracking-wide disabled:opacity-50 ${
        STATUS_STYLES[value] ?? STATUS_STYLES.new
      }`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function NotesField({ id, notes }: { id: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");
  const [pending, start] = useTransition();
  const dirty = value !== saved;
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!dirty) return;
          start(async () => {
            await updateLead(id, { notes: value });
            setSaved(value);
          });
        }}
        rows={2}
        placeholder="Add a note…"
        className="w-full resize-y rounded-lg border border-bone/10 bg-eclipse/60 px-3 py-2 text-sm text-bone placeholder:text-bone/25 focus:border-gold/50 focus:outline-none"
      />
      <p className="mt-1 h-4 text-[11px] text-bone/35">
        {pending ? "Saving…" : dirty ? "Click outside to save" : ""}
      </p>
    </div>
  );
}
