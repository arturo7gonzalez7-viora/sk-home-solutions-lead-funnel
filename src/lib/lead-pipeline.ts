// What happens after someone hits "Get my cash offer":
//  1. the lead is created in Steven's CRM
//  2. if they checked the call box, the Retell AI agent calls them right away
// Each step is guarded in the database so a double-click or retry never
// creates two CRM leads or dials twice.
import { getSql } from "./db";
import { pushLeadToCrm, addCallToCrm } from "./crm";
import { startRetellCall } from "./retell";

type Row = Record<string, unknown> & { id: string };

export async function finalizeLead(id: string) {
  const sql = getSql();

  // 1) CRM
  const [crmClaim] = (await sql`
    update leads set crm_synced_at = now()
    where id = ${id} and crm_synced_at is null and phone is not null
    returning *
  `) as Row[];
  if (crmClaim) {
    try {
      const crmId = await pushLeadToCrm(crmClaim as never);
      await sql`update leads set crm_lead_id = ${crmId}, crm_error = null where id = ${id}`;
    } catch (err) {
      console.error("CRM push failed", err);
      await sql`update leads set crm_error = ${String(err).slice(0, 500)} where id = ${id}`;
    }
  }

  // 2) AI call, only with consent
  const [callClaim] = (await sql`
    update leads set call_requested_at = now()
    where id = ${id} and call_consent = true and call_requested_at is null and phone is not null
    returning *
  `) as Row[];
  if (callClaim) {
    const result = await startRetellCall(callClaim as never);
    if (result.ok) {
      await sql`
        update leads set retell_call_id = ${result.callId}, call_status = ${result.status}, call_error = null
        where id = ${id}
      `;
    } else {
      console.error("Retell call failed", result.error);
      await sql`update leads set call_status = 'failed', call_error = ${result.error} where id = ${id}`;
    }
  }
}

// After Retell finishes analyzing the call: send the results to the CRM once.
export async function syncCallToCrm(id: string, call: Parameters<typeof addCallToCrm>[1]) {
  const sql = getSql();
  const [claim] = (await sql`
    update leads set crm_call_synced_at = now()
    where id = ${id} and crm_call_synced_at is null and crm_lead_id is not null
    returning crm_lead_id
  `) as { crm_lead_id: string }[];
  if (!claim) return;
  try {
    await addCallToCrm(claim.crm_lead_id, call);
  } catch (err) {
    console.error("CRM call sync failed", err);
    await sql`
      update leads set crm_call_synced_at = null, crm_error = ${String(err).slice(0, 500)}
      where id = ${id}
    `;
  }
}
