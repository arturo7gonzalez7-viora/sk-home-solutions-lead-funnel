import { after, NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { CONSENT_TEXT } from "@/lib/lead-meta";
import { finalizeLead } from "@/lib/lead-pipeline";

const clip = (v: unknown, max = 500) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

// POST /api/leads
// Called after every step of the funnel (not just the final submit) so a
// half-finished form is still a lead you can follow up on. Pass `id` once
// you have one (returned from the first call) to update the same row.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    const id = clip(body.id, 64);
    const address = clip(body.address);
    const city = clip(body.city, 120);
    const state = clip(body.state, 40);
    const zip = clip(body.zip, 20);
    const rawValue = Number(String(body.estimated_value ?? "").replace(/[^0-9.]/g, ""));
    const estimated_value = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : null;
    const condition = clip(body.condition, 40);
    const reason_for_selling = clip(body.reason_for_selling, 2000);
    const timeline = clip(body.timeline, 40);
    const full_name = clip(body.full_name, 200);
    const phone = clip(body.phone, 40);
    const email = clip(body.email, 200);
    const step_completed = Math.min(Math.max(Number(body.step_completed) || 1, 1), 3);
    const isFinal = step_completed === 3 && !!phone;
    const callConsent = isFinal && body.call_consent === true;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    // Final submit: record call consent (word-for-word) and kick off the CRM
    // push + AI call after the response is sent, so the visitor never waits.
    const finish = async (leadId: string) => {
      if (isFinal) {
        if (callConsent) {
          await sql`
            update leads set
              call_consent = true,
              consent_text = ${CONSENT_TEXT},
              consent_at = now(),
              consent_ip = ${ip},
              consent_user_agent = ${userAgent}
            where id = ${leadId} and call_consent = false
          `;
        }
        after(() => finalizeLead(leadId));
      }
      return NextResponse.json({ id: leadId });
    };

    if (id) {
      const [row] = await sql`
        update leads set
          address = coalesce(${address}, address),
          city = coalesce(${city}, city),
          state = coalesce(${state}, state),
          zip = coalesce(${zip}, zip),
          estimated_value = coalesce(${estimated_value}, estimated_value),
          condition = coalesce(${condition}, condition),
          reason_for_selling = coalesce(${reason_for_selling}, reason_for_selling),
          timeline = coalesce(${timeline}, timeline),
          full_name = coalesce(${full_name}, full_name),
          phone = coalesce(${phone}, phone),
          email = coalesce(${email}, email),
          step_completed = greatest(${step_completed}, step_completed),
          updated_at = now()
        where id = ${id}
        returning id;
      `;
      if (row) return finish(row.id);
      // Unknown id (e.g. stale tab): fall through and create a fresh lead.
    }

    const utm_source = clip(body.utm_source, 200);
    const utm_medium = clip(body.utm_medium, 200);
    const utm_campaign = clip(body.utm_campaign, 200);
    const utm_content = clip(body.utm_content, 200);
    const utm_term = clip(body.utm_term, 200);
    const fbclid = clip(body.fbclid, 500);
    const referrer = clip(body.referrer, 1000);
    const landing_url = clip(body.landing_url, 2000);
    const source =
      utm_campaign ?? utm_source ?? (fbclid ? "facebook" : null) ?? clip(body.source, 200);

    const [row] = await sql`
      insert into leads (
        address, city, state, zip, estimated_value, condition,
        reason_for_selling, timeline, full_name, phone, email,
        step_completed, source,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        fbclid, referrer, landing_url
      ) values (
        ${address}, ${city}, ${state}, ${zip}, ${estimated_value}, ${condition},
        ${reason_for_selling}, ${timeline}, ${full_name}, ${phone}, ${email},
        ${step_completed}, ${source},
        ${utm_source}, ${utm_medium}, ${utm_campaign}, ${utm_content}, ${utm_term},
        ${fbclid}, ${referrer}, ${landing_url}
      )
      returning id;
    `;
    return finish(row.id);
  } catch (err) {
    console.error("lead save failed", err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
