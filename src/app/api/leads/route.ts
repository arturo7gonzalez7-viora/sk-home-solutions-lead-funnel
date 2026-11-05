import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// POST /api/leads
// Called after every step of the funnel (not just the final submit) so a
// half-finished form is still a lead you can follow up on. Pass `id` once
// you have one (returned from the first call) to update the same row.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      address,
      city,
      state,
      zip,
      estimated_value,
      condition,
      reason_for_selling,
      timeline,
      full_name,
      phone,
      email,
      step_completed,
      source,
    } = body;

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
          step_completed = greatest(coalesce(${step_completed}, 1), step_completed),
          updated_at = now()
        where id = ${id}
        returning id;
      `;
      return NextResponse.json({ id: row?.id ?? id });
    }

    const [row] = await sql`
      insert into leads (
        address, city, state, zip, estimated_value, condition,
        reason_for_selling, timeline, full_name, phone, email,
        step_completed, source
      ) values (
        ${address}, ${city}, ${state}, ${zip}, ${estimated_value}, ${condition},
        ${reason_for_selling}, ${timeline}, ${full_name}, ${phone}, ${email},
        ${step_completed ?? 1}, ${source ?? null}
      )
      returning id;
    `;
    return NextResponse.json({ id: row.id });
  } catch (err) {
    console.error("lead save failed", err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
