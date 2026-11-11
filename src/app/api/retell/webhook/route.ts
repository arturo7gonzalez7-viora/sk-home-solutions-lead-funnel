import { after, NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { checkRetellSignature, RETELL_WEBHOOK_IP } from "@/lib/retell";
import { syncCallToCrm } from "@/lib/lead-pipeline";

// POST /api/retell/webhook
// Set this URL as the webhook on your Retell agent:
//   https://<your-site>/api/retell/webhook
// Retell sends call_started, call_ended and call_analyzed. We store the call
// results on the lead, and after call_analyzed push them into the CRM.
export async function POST(req: NextRequest) {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.warn("retell webhook: RETELL_API_KEY not set on this deployment");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const raw = await req.text();
  const sigHeader = req.headers.get("x-retell-signature");
  const check = checkRetellSignature(raw, sigHeader, apiKey);
  const ip =
    req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  if (!check.ok && ip !== RETELL_WEBHOOK_IP) {
    console.warn("retell webhook rejected", {
      reason: check.reason,
      ip,
      headerShape: sigHeader ? sigHeader.replace(/[0-9a-fA-F]{8,}/g, "<hex>").slice(0, 40) : null,
    });
    return NextResponse.json({ error: "bad_signature", reason: check.reason }, { status: 401 });
  }
  if (!check.ok) console.warn("retell webhook: accepted by Retell IP", { reason: check.reason });

  let payload: { event?: string; call?: Record<string, unknown> };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const call = payload.call ?? {};
  const metadata = (call.metadata ?? {}) as Record<string, unknown>;
  const leadId = typeof metadata.lead_id === "string" ? metadata.lead_id : null;
  // Calls this agent makes for other reasons aren't ours to record.
  if (!leadId) return new NextResponse(null, { status: 204 });

  await ensureSchema();
  const sql = getSql();
  const str = (v: unknown, max = 100_000) =>
    typeof v === "string" && v ? v.slice(0, max) : null;

  if (payload.event === "call_started") {
    await sql`update leads set call_status = 'ongoing' where id = ${leadId}`;
  } else if (payload.event === "call_ended") {
    await sql`
      update leads set
        call_status = ${str(call.call_status, 40) ?? "ended"},
        call_ended_reason = ${str(call.disconnection_reason, 200)},
        call_transcript = coalesce(${str(call.transcript)}, call_transcript),
        call_recording_url = coalesce(${str(call.recording_url, 2000)}, call_recording_url),
        updated_at = now()
      where id = ${leadId}
    `;
  } else if (payload.event === "call_analyzed") {
    const analysis = (call.call_analysis ?? {}) as Record<string, unknown>;
    const successful =
      typeof analysis.call_successful === "boolean" ? analysis.call_successful : null;
    await sql`
      update leads set
        call_status = ${str(call.call_status, 40) ?? "ended"},
        call_ended_reason = coalesce(${str(call.disconnection_reason, 200)}, call_ended_reason),
        call_transcript = coalesce(${str(call.transcript)}, call_transcript),
        call_recording_url = coalesce(${str(call.recording_url, 2000)}, call_recording_url),
        call_summary = ${str(analysis.call_summary, 5000)},
        call_successful = ${successful},
        call_sentiment = ${str(analysis.user_sentiment, 40)},
        call_analysis = ${JSON.stringify(analysis)},
        updated_at = now()
      where id = ${leadId}
    `;
    after(() => syncCallToCrm(leadId, call as never));
  }

  return new NextResponse(null, { status: 204 });
}
