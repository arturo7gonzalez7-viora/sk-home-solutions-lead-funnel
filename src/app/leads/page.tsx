import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ensureSchema, getSql } from "@/lib/db";
import {
  CONDITION_LABELS,
  isComplete,
  STATUSES,
  TIMELINE_LABELS,
  type Lead,
} from "@/lib/lead-meta";
import { NotesField, StatusSelect } from "./LeadControls";

export const metadata: Metadata = {
  title: "Leads | SK Home Solutions",
  robots: { index: false, follow: false },
};

type Search = { view?: string; status?: string };

export default function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <div className="flex flex-1 flex-col font-sans">
      <header className="border-b border-bone/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/sk-logo.png"
              alt="SK Home Solutions"
              width={30}
              height={30}
              className="h-7 w-7 object-contain"
            />
            <span className="text-xs font-medium tracking-[0.35em] text-bone uppercase">
              Leads
            </span>
          </div>
          <a
            href="/api/leads/export"
            className="rounded-full border border-gold/50 px-4 py-2 text-[11px] font-medium tracking-[0.25em] text-gold-light uppercase transition-colors hover:border-gold-light hover:bg-gold/10"
          >
            Export CSV
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Suspense
          fallback={<p className="text-sm text-bone/40">Loading leads…</p>}
        >
          <LeadsView searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const fmtMoney = (v: string | null) =>
  v
    ? Number(v).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : null;

async function LeadsView({ searchParams }: { searchParams: Promise<Search> }) {
  const { view = "all", status = "" } = await searchParams;

  let leads: (Lead & { recent: boolean })[] = [];
  let loadError: string | null = null;
  try {
    await ensureSchema();
    leads = (await getSql()`
      select *, created_at > now() - interval '7 days' as recent
      from leads order by created_at desc limit 1000
    `) as (Lead & { recent: boolean })[];
  } catch (err) {
    console.error("leads load failed", err);
    loadError =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "No database is connected. Set DATABASE_URL to load leads."
        : "Couldn't load leads from the database.";
  }

  const complete = leads.filter(isComplete);
  const stats = [
    { label: "Total leads", value: leads.length },
    { label: "Full submissions", value: complete.length },
    { label: "Started, not finished", value: leads.length - complete.length },
    {
      label: "Last 7 days",
      value: leads.filter((l) => l.recent).length,
    },
  ];

  const shown = leads.filter((l) => {
    if (view === "complete" && !isComplete(l)) return false;
    if (view === "partial" && isComplete(l)) return false;
    if (status && l.status !== status) return false;
    return true;
  });

  const href = (next: Partial<Search>) => {
    const p = new URLSearchParams();
    const v = next.view ?? view;
    const s = next.status ?? status;
    if (v && v !== "all") p.set("view", v);
    if (s) p.set("status", s);
    const q = p.toString();
    return q ? `/leads?${q}` : "/leads";
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs tracking-wide transition-colors ${
      active
        ? "border-gold bg-gold/10 text-bone"
        : "border-bone/15 text-bone/50 hover:border-bone/30 hover:text-bone/80"
    }`;

  return (
    <>
      <h1 className="font-display text-4xl text-bone sm:text-5xl">
        Seller leads
      </h1>

      <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-bone/10 bg-walnut/40 px-5 py-4"
          >
            <dt className="text-[11px] tracking-[0.2em] text-bone/45 uppercase">
              {s.label}
            </dt>
            <dd className="font-display mt-1 text-4xl text-bone">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {[
          { v: "all", l: "All" },
          { v: "complete", l: "Full submissions" },
          { v: "partial", l: "Started only" },
        ].map((o) => (
          <Link key={o.v} href={href({ view: o.v })} className={chip(view === o.v)}>
            {o.l}
          </Link>
        ))}
        <span className="mx-2 hidden h-5 w-px bg-bone/10 sm:block" />
        <Link href={href({ status: "" })} className={chip(!status)}>
          Any status
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={href({ status: s.value })}
            className={chip(status === s.value)}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {loadError && (
        <p className="mt-10 rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-sm text-red-200">
          {loadError}
        </p>
      )}

      {!loadError && shown.length === 0 && (
        <p className="mt-16 text-center text-sm text-bone/40">
          {leads.length === 0
            ? "No leads yet. They'll show up here as soon as someone fills out the form."
            : "No leads match these filters."}
        </p>
      )}

      <ul className="mt-8 space-y-4">
        {shown.map((l) => {
          const done = isComplete(l);
          const place = [l.address, l.city, l.state, l.zip]
            .filter(Boolean)
            .join(", ");
          const details = [
            l.condition && (CONDITION_LABELS[l.condition] ?? l.condition),
            l.timeline && (TIMELINE_LABELS[l.timeline] ?? l.timeline),
            fmtMoney(l.estimated_value) && `Est. ${fmtMoney(l.estimated_value)}`,
          ].filter(Boolean);
          const campaign =
            l.utm_campaign ?? l.source ?? (l.fbclid ? "facebook" : null);
          return (
            <li
              key={l.id}
              className="rounded-2xl border border-bone/10 bg-walnut/40 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl text-bone">
                    {l.full_name || (
                      <span className="text-bone/40 italic">No name yet</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-bone/40">
                    {fmtDate(l.created_at)}
                    {" · "}
                    <span className={done ? "text-emerald-300/80" : "text-gold-light/80"}>
                      {done ? "Full submission" : `Stopped at step ${l.step_completed} of 3`}
                    </span>
                  </p>
                </div>
                <StatusSelect id={l.id} status={l.status} />
              </div>

              <div className="mt-5 grid gap-5 text-sm md:grid-cols-[1fr_1fr_1.2fr]">
                <div className="space-y-1.5">
                  <p className="text-[11px] tracking-[0.2em] text-bone/35 uppercase">
                    Contact
                  </p>
                  {l.phone ? (
                    <a href={`tel:${l.phone}`} className="block text-gold-light hover:underline">
                      {l.phone}
                    </a>
                  ) : (
                    <p className="text-bone/30">No phone</p>
                  )}
                  {l.email ? (
                    <a href={`mailto:${l.email}`} className="block break-all text-bone/70 hover:underline">
                      {l.email}
                    </a>
                  ) : (
                    <p className="text-bone/30">No email</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] tracking-[0.2em] text-bone/35 uppercase">
                    Property
                  </p>
                  <p className="text-bone/80">{place || "No address"}</p>
                  {details.length > 0 && (
                    <p className="text-bone/50">{details.join(" · ")}</p>
                  )}
                  {l.reason_for_selling && (
                    <p className="text-bone/50 italic">&ldquo;{l.reason_for_selling}&rdquo;</p>
                  )}
                  <p className="text-xs text-bone/35">
                    Source: {campaign ?? "Direct"}
                    {l.utm_content ? ` · Ad: ${l.utm_content}` : ""}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] tracking-[0.2em] text-bone/35 uppercase">
                    Notes
                  </p>
                  <NotesField id={l.id} notes={l.notes} />
                </div>
              </div>

              {done && (
                <div className="mt-5 border-t border-bone/10 pt-4 text-sm">
                  <p className="text-[11px] tracking-[0.2em] text-bone/35 uppercase">
                    AI call
                  </p>
                  {!l.call_consent ? (
                    <p className="mt-1.5 text-bone/45">
                      Didn&rsquo;t check the call box, so no automatic call. Follow up by hand.
                    </p>
                  ) : (
                    <div className="mt-1.5 space-y-1.5">
                      <p className="text-bone/70">
                        Status: {l.call_status ?? "queued"}
                        {l.call_successful === true && " · goal reached"}
                        {l.call_successful === false && " · goal not reached"}
                        {l.call_recording_url && (
                          <>
                            {" · "}
                            <a href={l.call_recording_url} target="_blank" rel="noreferrer" className="text-gold-light hover:underline">
                              Recording
                            </a>
                          </>
                        )}
                      </p>
                      {l.call_summary && <p className="text-bone/55">{l.call_summary}</p>}
                      {l.call_error && <p className="text-red-300/80">Call error: {l.call_error}</p>}
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-bone/35">
                    {l.crm_lead_id
                      ? `In Steven's CRM (${l.crm_lead_id})`
                      : l.crm_error
                        ? `CRM sync failed: ${l.crm_error}`
                        : "Not in the CRM yet"}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
