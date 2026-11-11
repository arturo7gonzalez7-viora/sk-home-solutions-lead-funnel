// Retell AI: start an outbound call to a fresh lead, and verify the webhook
// Retell sends when the call ends.
//
// Env vars (Vercel project settings):
//   RETELL_API_KEY      – the Retell API key that has the "webhook" badge
//                         (that same key is used to verify webhooks)
//   RETELL_FROM_NUMBER  – your Retell phone number, e.g. +17205551234
//   RETELL_AGENT_ID     – optional; the agent to use for these calls. If not
//                         set, Retell uses the agent bound to the from-number.
import { createHmac, timingSafeEqual } from "crypto";
import { CONDITION_LABELS, TIMELINE_LABELS } from "./lead-meta";

export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export type LeadForCall = {
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
};

// Variables your Retell agent prompt can use, e.g. "Hi {{first_name}}, this is
// SK Home Solutions calling about {{property_address}}..."
export function callVariables(lead: LeadForCall): Record<string, string> {
  const first = (lead.full_name ?? "").trim().split(/\s+/)[0] ?? "";
  const fullAddress = [lead.address, lead.city, lead.state, lead.zip]
    .filter(Boolean)
    .join(", ");
  const value = Number(lead.estimated_value);
  return {
    first_name: first,
    full_name: lead.full_name ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    property_address: lead.address ?? "",
    full_address: fullAddress,
    city: lead.city ?? "",
    state: lead.state ?? "",
    zip: lead.zip ?? "",
    condition: lead.condition ? (CONDITION_LABELS[lead.condition] ?? lead.condition) : "",
    timeline: lead.timeline ? (TIMELINE_LABELS[lead.timeline] ?? lead.timeline) : "",
    estimated_value: Number.isFinite(value) && value > 0 ? `$${value.toLocaleString("en-US")}` : "",
    reason_for_selling: lead.reason_for_selling ?? "",
  };
}

export type StartCallResult =
  | { ok: true; callId: string; status: string }
  | { ok: false; error: string };

export async function startRetellCall(lead: LeadForCall): Promise<StartCallResult> {
  const apiKey = process.env.RETELL_API_KEY;
  const from = process.env.RETELL_FROM_NUMBER?.trim();
  if (!apiKey || !from) return { ok: false, error: "retell_not_configured" };

  const to = toE164(lead.phone);
  if (!to) return { ok: false, error: "invalid_phone" };

  const body: Record<string, unknown> = {
    from_number: from,
    to_number: to,
    metadata: { lead_id: lead.id, source: "sk-landing-page" },
    retell_llm_dynamic_variables: callVariables(lead),
    // Retrying the same submit within an hour never dials twice.
    idempotency_key: `sk-lead-${lead.id}`,
  };
  const agentId = process.env.RETELL_AGENT_ID?.trim();
  if (agentId) body.override_agent_id = agentId;

  try {
    const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg = typeof data.message === "string" ? data.message : JSON.stringify(data);
      return { ok: false, error: `retell_${res.status}: ${msg}`.slice(0, 500) };
    }
    return {
      ok: true,
      callId: String(data.call_id ?? ""),
      status: String(data.call_status ?? "registered"),
    };
  } catch (err) {
    return { ok: false, error: `retell_fetch_failed: ${String(err)}`.slice(0, 500) };
  }
}

// Retell signs each webhook: header "x-retell-signature: v=<ms>,d=<hex>",
// where d = HMAC-SHA256(rawBody + v) keyed with your API key.
export function verifyRetellSignature(
  rawBody: string,
  header: string | null,
  apiKey: string,
): boolean {
  const match = /v=(\d+),d=([0-9a-fA-F]+)/.exec(header ?? "");
  if (!match) return false;
  const [, timestamp, digest] = match;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", apiKey).update(rawBody + timestamp).digest();
  const received = Buffer.from(digest, "hex");
  return received.length === expected.length && timingSafeEqual(expected, received);
}
