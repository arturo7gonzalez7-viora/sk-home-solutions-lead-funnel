import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/admin-auth";
import { ensureSchema, getSql } from "@/lib/db";
import {
  CONDITION_LABELS,
  isComplete,
  STATUSES,
  TIMELINE_LABELS,
  type Lead,
} from "@/lib/lead-meta";

// GET /api/leads/export: every lead as a CSV (opens in Excel / Google Sheets).
export async function GET(req: NextRequest) {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return new NextResponse("Sign in required", { status: 401 });
  }
  await ensureSchema();
  const leads = (await getSql()`select * from leads order by created_at desc`) as Lead[];

  const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v;
  const columns: [string, (l: Lead) => unknown][] = [
    ["Date", (l) => new Date(l.created_at).toLocaleString("en-US", { timeZone: "America/Denver" })],
    ["Name", (l) => l.full_name],
    ["Phone", (l) => l.phone],
    ["Email", (l) => l.email],
    ["Address", (l) => l.address],
    ["City", (l) => l.city],
    ["State", (l) => l.state],
    ["Zip", (l) => l.zip],
    ["Estimated value", (l) => l.estimated_value],
    ["Condition", (l) => (l.condition ? CONDITION_LABELS[l.condition] ?? l.condition : "")],
    ["Timeline", (l) => (l.timeline ? TIMELINE_LABELS[l.timeline] ?? l.timeline : "")],
    ["Reason for selling", (l) => l.reason_for_selling],
    ["Submission", (l) => (isComplete(l) ? "Full" : `Stopped at step ${l.step_completed}`)],
    ["Status", (l) => statusLabel(l.status)],
    ["Notes", (l) => l.notes],
    ["UTM source", (l) => l.utm_source],
    ["UTM medium", (l) => l.utm_medium],
    ["UTM campaign", (l) => l.utm_campaign],
    ["UTM content", (l) => l.utm_content],
    ["UTM term", (l) => l.utm_term],
    ["From Facebook ad", (l) => (l.fbclid ? "Yes" : "")],
    ["Lead ID", (l) => l.id],
  ];

  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Stop spreadsheet apps treating text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    columns.map(([h]) => cell(h)).join(","),
    ...leads.map((l) => columns.map(([, get]) => cell(get(l))).join(",")),
  ].join("\r\n");

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sk-leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
