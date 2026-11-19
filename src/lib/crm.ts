// Pushes leads into Steven's CRM (steven-crm.vercel.app). The CRM keeps its
// data in its own Neon database, in a `leads` table shaped like:
//   id text ('l' + timestamp), name, address, phone, email, ask_price int,
//   situation (foreclosure|divorce|inherited|financial|moving),
//   timeline (asap|1-3mo|6mo), condition (good|minor|major|poor),
//   score 0-10, status (new|contacted|offer|dead), last_contact (YYYY-MM-DD),
//   notes [{text, date}], assigned_to, lead_source
//
// Env vars (Vercel project settings):
//   CRM_DATABASE_URL  – connection string of the CRM's Neon database
//   CRM_ASSIGN_TO     – optional CRM user id to assign new leads to (e.g. u_steven)
//   CRM_URL           – optional, defaults to https://steven-crm.vercel.app (used for the new-lead email)
import { neon } from "@neondatabase/serverless";
import {
  crmCallUpdate,
  newCrmLeadFields,
  today,
  type CallInfo,
  type FunnelLead,
} from "./crm-mapping";

function crmSql() {
  const url = process.env.CRM_DATABASE_URL;
  return url ? neon(url) : null;
}

// Creates the lead in the CRM. Returns the CRM lead id, or null when no CRM
// database is configured.
export async function pushLeadToCrm(l: FunnelLead): Promise<string | null> {
  const sql = crmSql();
  if (!sql) return null;
  const f = newCrmLeadFields(l);
  const id = `l${Date.now()}`;
  await sql`
    insert into leads (
      id, name, address, phone, email, ask_price, situation, timeline,
      condition, score, status, last_contact, notes, assigned_to, lead_source
    ) values (
      ${id}, ${f.name}, ${f.address}, ${f.phone}, ${f.email},
      ${f.ask_price}, ${f.situation}, ${f.timeline}, ${f.condition},
      ${f.score}, ${"new"}, ${today()}, ${JSON.stringify(f.notes)},
      ${process.env.CRM_ASSIGN_TO ?? ""}, ${f.lead_source}
    )
  `;
  return id;
}

// Adds the AI call results to the CRM lead as a note, and fills in anything
// the call learned (asking price, situation, timeline, condition). Throws if
// the CRM lead is missing so the caller can record the failure.
export async function addCallToCrm(crmLeadId: string, call: CallInfo): Promise<void> {
  const sql = crmSql();
  if (!sql) throw new Error("CRM_DATABASE_URL not set");

  const [row] = (await sql`
    select notes, ask_price, situation, timeline, condition from leads where id = ${crmLeadId}
  `) as Parameters<typeof crmCallUpdate>[0][];
  if (!row) throw new Error(`CRM lead ${crmLeadId} not found`);

  const u = crmCallUpdate(row, call);
  await sql`
    update leads set
      notes = ${JSON.stringify(u.notes)},
      last_contact = ${today()},
      ask_price = ${u.ask_price},
      situation = ${u.situation},
      timeline = ${u.timeline},
      condition = ${u.condition},
      score = ${u.score}
    where id = ${crmLeadId}
  `;
}

// Asks the CRM to email Steven about a lead it just received. The CRM sends it
// at most once per lead, so retries are safe. Never throws.
export async function notifyCrmNewLead(crmLeadId: string): Promise<void> {
  const base = (process.env.CRM_URL ?? "https://steven-crm.vercel.app").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/lead-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: crmLeadId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("CRM lead alert failed", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("CRM lead alert failed", err);
  }
}
