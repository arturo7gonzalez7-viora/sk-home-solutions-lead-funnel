// Turns funnel leads and Retell call results into the shape Steven's CRM
// stores. Pure functions only (no database), so they can be tested directly.
//
// CRM field values it understands:
//   situation: foreclosure | divorce | inherited | financial | moving
//   timeline:  asap | 1-3mo | 6mo
//   condition: good | minor | major | poor
// The CRM shows a blank value as "foreclosure" / "asap" / "good", so anything
// we can't work out is stored as "unknown" instead of left blank.
import { CONDITION_LABELS, TIMELINE_LABELS } from "./lead-meta";

export const UNKNOWN = "unknown";

export type FunnelLead = {
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

export type CallInfo = {
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

export type CrmNote = { text: string; date: string; type?: string; [k: string]: unknown };

export const TIMELINE_MAP: Record<string, string> = {
  asap: "asap",
  "30_days": "asap",
  "90_days": "1-3mo",
  just_looking: "6mo",
};

export const CONDITION_MAP: Record<string, string> = {
  move_in_ready: "good",
  clean_working: "minor",
  needs_some_work: "major",
  needs_major_work: "poor",
};

export const today = () => new Date().toISOString().split("T")[0];

// Same scoring the CRM uses, so funnel leads rank like hand-entered ones.
export function score(sit: string, tl: string, cond: string) {
  let s = 0;
  if (tl === "asap") s += 4;
  else if (tl === "1-3mo") s += 2;
  if (["foreclosure", "divorce", "financial"].includes(sit)) s += 3;
  else if (sit === "inherited") s += 2;
  if (cond === "poor" || cond === "major") s += 2;
  else if (cond === "minor") s += 1;
  return Math.min(10, s);
}

export function guessSituation(text: string | null | undefined): string {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return "";
  if (/foreclos|auction|notice of default|bank is taking/.test(t)) return "foreclosure";
  if (/divorc|separat/.test(t)) return "divorce";
  if (/inherit|probate|passed away|deceased|\bdied\b|death|estate sale|the estate\b/.test(t)) return "inherited";
  if (/behind|missed payment|can'?t (afford|make)|afford|debt|bankrupt|lien|back taxes|hardship|lost (my|his|her|their) job/.test(t)) return "financial";
  if (/relocat|\bmov(e|ing)\b|transfer|downsiz|new job|job in/.test(t)) return "moving";
  return "";
}

const WORD_NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const num = (w: string) => (/^\d+$/.test(w) ? Number(w) : WORD_NUM[w] ?? NaN);

export function guessTimeline(text: string | null | undefined): string {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return "";
  if (/just (looking|exploring)|exploring|no rush|not sure|eventually|someday|year/.test(t)) return "6mo";

  // "2 or 3 months", "within 90 days", "a couple of weeks": use the longest span named.
  const N = "(\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
  let days = 0;
  for (const m of t.matchAll(new RegExp(`${N}(?:\\s*(?:-|to|or)\\s*${N})?\\s*(day|week|month)s?`, "g"))) {
    const n = Math.max(num(m[1]), m[2] ? num(m[2]) : 0);
    if (!Number.isFinite(n)) continue;
    days = Math.max(days, n * (m[3] === "day" ? 1 : m[3] === "week" ? 7 : 30));
  }
  const unit = { day: 1, week: 7, month: 30 } as const;
  for (const m of t.matchAll(/(couple|few)\s+(?:of\s+)?(day|week|month)s/g)) {
    days = Math.max(days, (m[1] === "couple" ? 2 : 3) * unit[m[2] as keyof typeof unit]);
  }
  if (days > 0) return days <= 45 ? "asap" : days <= 120 ? "1-3mo" : "6mo";

  if (/asap|as soon as|immediate|right away|right now|urgent|soon|this month|next month|\bnow\b/.test(t)) return "asap";
  return "";
}

export function guessCondition(text: string | null | undefined): string {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return "";
  if (/move.?in|turn.?key|(no|doesn'?t need|does not need|without)( any)? (repairs|work|issues)|great (shape|condition)|good (shape|condition)|updated|remodel/.test(t)) return "good";
  if (/gut|foundation|fire|flood|mold|condemn|uninhabit|tear.?down|major (work|repairs|damage)|needs major|poor/.test(t)) return "poor";
  if (/roof|hvac|furnace|kitchen|bath|plumbing|electrical|some work|needs work|repairs/.test(t)) return "major";
  if (/minor|cosmetic|paint|carpet|dated|small|clean/.test(t)) return "minor";
  return "";
}

// "$300K", "between 250 and 300k" -> 250000, "1.2 million", "325,000".
// Returns null for anything that isn't a plausible house price.
export function parseMoney(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 1000 ? Math.round(v) : null;
  const t = String(v ?? "").toLowerCase().replace(/(\d),(?=\d{3})/g, "$1");
  const matches = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(k|thousand|m|mil|million)?\b/g)];
  if (!matches.length) return null;
  // In a range, a suffix on the second number applies to the first too.
  const lastSuffix = [...matches].reverse().find((m) => m[2])?.[2];
  const [, n, suffix = lastSuffix] = matches[0];
  const mult = !suffix ? 1 : /^(k|thousand)$/.test(suffix) ? 1_000 : 1_000_000;
  const value = Math.round(Number(n) * mult);
  return value >= 1000 ? value : null;
}

export function leadSource(l: Pick<FunnelLead, "utm_source" | "utm_campaign" | "fbclid">): string {
  const src = `${l.utm_source ?? ""} ${l.utm_campaign ?? ""}`.toLowerCase();
  if (l.fbclid || /facebook|\bfb\b|instagram|\big\b|meta/.test(src)) return "Facebook Ad";
  if (/google|gads|adwords/.test(src)) return "Google PPC";
  return "Website";
}

// First note on a new CRM lead. `type: "intake"` lets the CRM read the fields
// directly; the text is kept for older CRM versions and the timeline view.
export function intakeNote(l: FunnelLead): CrmNote {
  const value = parseMoney(l.estimated_value);
  const intake = {
    condition: l.condition ? (CONDITION_LABELS[l.condition] ?? l.condition) : "",
    timeline: l.timeline ? (TIMELINE_LABELS[l.timeline] ?? l.timeline) : "",
    estimate: value ? `$${value.toLocaleString("en-US")}` : "",
    reason: l.reason_for_selling ?? "",
    campaign: l.utm_campaign ?? "",
    ad: l.utm_content ?? "",
    consent: l.call_consent,
  };
  const parts = [
    "Lead came in from the SK landing page.",
    intake.condition ? `Condition: ${intake.condition}.` : "",
    intake.timeline ? `Timeline: ${intake.timeline}.` : "",
    intake.estimate ? `Seller's estimate: ${intake.estimate}.` : "",
    intake.reason ? `Why selling: "${intake.reason}".` : "",
    intake.campaign ? `Ad campaign: ${intake.campaign}${intake.ad ? ` / ${intake.ad}` : ""}.` : "",
    l.call_consent
      ? "Agreed to calls/texts incl. AI voice; AI call started automatically."
      : "Did NOT check call consent; no AI call placed. Follow up manually.",
  ];
  return { text: parts.filter(Boolean).join(" "), date: today(), type: "intake", intake };
}

export function newCrmLeadFields(l: FunnelLead) {
  const situation = guessSituation(l.reason_for_selling) || UNKNOWN;
  const timeline = (l.timeline && TIMELINE_MAP[l.timeline]) || UNKNOWN;
  const condition = (l.condition && CONDITION_MAP[l.condition]) || UNKNOWN;
  return {
    name: l.full_name?.trim() || "Unknown",
    address: [l.address, l.city, l.state, l.zip].filter(Boolean).join(", "),
    phone: l.phone ?? "",
    email: l.email ?? "",
    ask_price: parseMoney(l.estimated_value) ?? 0,
    situation,
    timeline,
    condition,
    score: score(situation, timeline, condition),
    notes: [intakeNote(l)],
    lead_source: leadSource(l),
  };
}

const isBlank = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && !v.trim());

// Finds the first answer whose key matches one of the patterns (in priority
// order) and that `parse` can make sense of.
function pickAnswer<T>(
  data: Record<string, unknown>,
  patterns: RegExp[],
  parse: (v: unknown) => T | null | "",
): T | null {
  for (const p of patterns) {
    for (const [k, v] of Object.entries(data)) {
      if (isBlank(v) || !p.test(k)) continue;
      const parsed = parse(v);
      if (parsed !== null && parsed !== "") return parsed as T;
    }
  }
  return null;
}

const asText = (v: unknown) => (typeof v === "object" ? JSON.stringify(v) : String(v));

export function callNote(call: CallInfo): CrmNote {
  const a = call.call_analysis ?? {};
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(a.custom_analysis_data ?? {})) {
    if (!isBlank(v)) answers[k] = asText(v);
  }
  const ended = call.disconnection_reason ? call.disconnection_reason.replace(/_/g, " ") : "";
  const answerText = Object.entries(answers)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join("; ");
  const lines = [
    `AI call (Retell) ${a.call_successful === false ? "did not complete its goal" : "finished"}${ended ? ` (${ended})` : ""}.`,
    a.call_summary ? `Summary: ${a.call_summary}` : "",
    answerText ? `Answers: ${answerText}` : "",
    a.user_sentiment ? `Sentiment: ${a.user_sentiment}.` : "",
    call.recording_url ? `Recording: ${call.recording_url}` : "",
  ];
  return {
    text: lines.filter(Boolean).join(" "),
    date: today(),
    type: "ai_call",
    call: {
      call_id: call.call_id ?? "",
      successful: typeof a.call_successful === "boolean" ? a.call_successful : null,
      ended,
      summary: a.call_summary ?? "",
      answers,
      sentiment: a.user_sentiment ?? "",
      recording: call.recording_url ?? "",
    },
  };
}

export function parseNotes(raw: unknown): CrmNote[] {
  if (Array.isArray(raw)) return raw as CrmNote[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

type CrmLeadRow = {
  notes: unknown;
  ask_price: number | null;
  situation: string | null;
  timeline: string | null;
  condition: string | null;
};

// What to write back to the CRM lead once the AI call has been analyzed:
// the call as a note, plus anything the call learned. Re-running it for the
// same call doesn't add the note twice.
export function crmCallUpdate(row: CrmLeadRow, call: CallInfo) {
  const notes = parseNotes(row.notes);
  const note = callNote(call);
  const callId = call.call_id;
  const already =
    !!callId &&
    notes.some((n) => n?.type === "ai_call" && (n.call as { call_id?: string })?.call_id === callId);
  if (!already) notes.push(note);

  const data = call.call_analysis?.custom_analysis_data ?? {};
  const known = (v: string | null) => (v && v !== UNKNOWN ? v : "");

  const askPrice =
    pickAnswer(data, [/ask/i, /price/i, /expect/i, /want/i, /hop(e|ing)/i], parseMoney) ??
    (row.ask_price || 0);
  const situation =
    pickAnswer(data, [/situation/i, /reason/i, /motivat/i, /why/i], (v) => guessSituation(asText(v))) ||
    known(row.situation) ||
    UNKNOWN;
  const timeline =
    pickAnswer(data, [/timeline/i, /how_?soon/i, /when/i, /move_?out/i, /clos(e|ing)/i], (v) =>
      guessTimeline(asText(v)),
    ) ||
    known(row.timeline) ||
    UNKNOWN;
  const condition =
    pickAnswer(data, [/condition/i, /repair/i, /work/i, /issue/i], (v) => guessCondition(asText(v))) ||
    known(row.condition) ||
    UNKNOWN;

  return {
    notes,
    ask_price: askPrice,
    situation,
    timeline,
    condition,
    score: score(situation, timeline, condition),
    added_note: !already,
  };
}
