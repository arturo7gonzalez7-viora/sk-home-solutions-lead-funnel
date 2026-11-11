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
import { neon } from "@neondatabase/serverless";
import { CONDITION_LABELS, TIMELINE_LABELS } from "./lead-meta";

type FunnelLead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  estimated_value: string | number | null;
  condition: string | null;
  timeline: string | null;
  reason_for_selling: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  fbclid: string | null;
  call_consent: boolean;
  crm_lead_id: string | null;
};

type CallInfo = {
  call_id?: string;
  call_status?: string;
  disconnection_reason?: string;
  recording_url?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
};

const TIMELINE_MAP: Record<string, string> = {
  asap: "asap",
  "30_days": "asap",
  "90_days": "1-3mo",
  just_looking: "6mo",
};

const CONDITION_MAP: Record<string, string> = {
  move_in_ready: "good",
  clean_working: "minor",
  needs_some_work: "major",
  needs_major_work: "poor",
};

function crmSql() {
  const url = process.env.CRM_DATABASE_URL;
  return url ? neon(url) : null;
}

const today = () => new Date().toISOString().split("T")[0];

// Same scoring the CRM uses, so funnel leads rank like hand-entered ones.
function score(sit: string, tl: string, cond: string) {
  let s = 0;
  if (tl === "asap") s += 4;
  else if (tl === "1-3mo") s += 2;
  if (["foreclosure", "divorce", "financial"].includes(sit)) s += 3;
  else if (sit === "inherited") s += 2;
  if (cond === "poor" || cond === "major") s += 2;
  else if (cond === "minor") s += 1;
  return Math.min(10, s);
}

function guessSituation(text: string | null | undefined): string {
  const t = (text ?? "").toLowerCase();
  if (!t) return "";
  if (/foreclos|pre-?foreclos|auction|notice of default/.test(t)) return "foreclosure";
  if (/divorc|separat/.test(t)) return "divorce";
  if (/inherit|probate|passed away|estate|died|death/.test(t)) return "inherited";
  if (/behind|payment|debt|financ|bankrupt|lien|tax|afford|hardship/.test(t)) return "financial";
  if (/relocat|moving|move|job|transfer|downsiz/.test(t)) return "moving";
  return "";
}

function guessTimeline(text: string): string {
  const t = text.toLowerCase();
  if (/asap|immediate|now|week|30|month|soon/.test(t) && !/6|six|year/.test(t)) return "asap";
  if (/2|3|two|three|90|quarter/.test(t)) return "1-3mo";
  if (/6|six|year|later|not sure|explor/.test(t)) return "6mo";
  return "";
}

function guessCondition(text: string): string {
  const t = text.toLowerCase();
  if (/gut|foundation|fire|flood|mold|condemn|major|uninhabit|poor/.test(t)) return "poor";
  if (/roof|hvac|kitchen|bath|some work|repairs|dated|needs work/.test(t)) return "major";
  if (/minor|cosmetic|paint|carpet|small/.test(t)) return "minor";
  if (/good|move.?in|great|updated|remodel/.test(t)) return "good";
  return "";
}

function money(v: unknown): number | null {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function leadSource(l: FunnelLead): string {
  const src = `${l.utm_source ?? ""} ${l.utm_campaign ?? ""}`.toLowerCase();
  if (l.fbclid || /facebook|fb|instagram|ig|meta/.test(src)) return "Facebook Ad";
  if (/google|gads|adwords/.test(src)) return "Google PPC";
  return "Website";
}

function funnelNote(l: FunnelLead): string {
  const parts = [
    "Lead came in from the SK landing page.",
    l.condition ? `Condition: ${CONDITION_LABELS[l.condition] ?? l.condition}.` : "",
    l.timeline ? `Timeline: ${TIMELINE_LABELS[l.timeline] ?? l.timeline}.` : "",
    money(l.estimated_value) ? `Seller's estimate: $${money(l.estimated_value)!.toLocaleString("en-US")}.` : "",
    l.reason_for_selling ? `Why selling: "${l.reason_for_selling}".` : "",
    l.utm_campaign ? `Ad campaign: ${l.utm_campaign}${l.utm_content ? ` / ${l.utm_content}` : ""}.` : "",
    l.call_consent
      ? "Agreed to calls/texts incl. AI voice; AI call started automatically."
      : "Did NOT check call consent; no AI call placed. Follow up manually.",
  ];
  return parts.filter(Boolean).join(" ");
}

// Creates the lead in the CRM. Returns the CRM lead id.
export async function pushLeadToCrm(l: FunnelLead): Promise<string | null> {
  const sql = crmSql();
  if (!sql) return null;
  const situation = guessSituation(l.reason_for_selling);
  const timeline = l.timeline ? (TIMELINE_MAP[l.timeline] ?? "") : "";
  const condition = l.condition ? (CONDITION_MAP[l.condition] ?? "") : "";
  const address = [l.address, l.city, l.state, l.zip].filter(Boolean).join(", ");
  const id = `l${Date.now()}`;
  const notes = JSON.stringify([{ text: funnelNote(l), date: today() }]);
  await sql`
    insert into leads (
      id, name, address, phone, email, ask_price, situation, timeline,
      condition, score, status, last_contact, notes, assigned_to, lead_source
    ) values (
      ${id}, ${l.full_name ?? "Unknown"}, ${address}, ${l.phone ?? ""}, ${l.email ?? ""},
      ${money(l.estimated_value) ?? 0}, ${situation}, ${timeline}, ${condition},
      ${score(situation, timeline, condition)}, ${"new"}, ${today()}, ${notes},
      ${process.env.CRM_ASSIGN_TO ?? ""}, ${leadSource(l)}
    )
  `;
  return id;
}

function pick(data: Record<string, unknown>, ...patterns: RegExp[]): string {
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined || v === "") continue;
    if (patterns.some((p) => p.test(k))) return String(v);
  }
  return "";
}

// Adds the AI call results to the CRM lead as a note, and fills in anything
// the call learned (asking price, situation, timeline, condition).
export async function addCallToCrm(crmLeadId: string, call: CallInfo): Promise<void> {
  const sql = crmSql();
  if (!sql) return;

  const a = call.call_analysis ?? {};
  const data = a.custom_analysis_data ?? {};
  const answers = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("; ");

  const lines = [
    `AI call (Retell) ${a.call_successful === false ? "did not complete its goal" : "finished"}${call.disconnection_reason ? ` (${call.disconnection_reason.replace(/_/g, " ")})` : ""}.`,
    a.call_summary ? `Summary: ${a.call_summary}` : "",
    answers ? `Answers: ${answers}` : "",
    a.user_sentiment ? `Sentiment: ${a.user_sentiment}.` : "",
    call.recording_url ? `Recording: ${call.recording_url}` : "",
  ];
  const note = { text: lines.filter(Boolean).join(" "), date: today() };

  const [row] = (await sql`select notes, ask_price, situation, timeline, condition from leads where id = ${crmLeadId}`) as {
    notes: unknown;
    ask_price: number | null;
    situation: string | null;
    timeline: string | null;
    condition: string | null;
  }[];
  if (!row) return;

  let notes: unknown[] = [];
  if (Array.isArray(row.notes)) notes = row.notes;
  else if (typeof row.notes === "string") {
    try {
      const parsed = JSON.parse(row.notes);
      if (Array.isArray(parsed)) notes = parsed;
    } catch {}
  }
  notes.push(note);

  const askPrice = money(pick(data, /ask/i, /price/i, /want/i)) ?? row.ask_price ?? 0;
  const situation =
    guessSituation(pick(data, /situation/i, /reason/i, /motivat/i, /why/i)) || row.situation || "";
  const timeline = guessTimeline(pick(data, /timeline/i, /when/i, /how_soon/i, /close/i)) || row.timeline || "";
  const condition = guessCondition(pick(data, /condition/i, /repair/i, /work/i)) || row.condition || "";

  await sql`
    update leads set
      notes = ${JSON.stringify(notes)},
      last_contact = ${today()},
      ask_price = ${askPrice},
      situation = ${situation},
      timeline = ${timeline},
      condition = ${condition},
      score = ${score(situation, timeline, condition)}
    where id = ${crmLeadId}
  `;
}
