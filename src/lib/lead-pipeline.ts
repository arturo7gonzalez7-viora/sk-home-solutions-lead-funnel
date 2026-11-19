// What happens after someone hits "Get my cash offer":
//  1. the lead is created in Steven's CRM
//  2. if they checked the call box, the Retell AI agent calls them right away
//  3. Steven gets one email about the lead: after the AI call is analyzed (so it
//     carries the summary and callback time), or right away when there is no call
// Each step is guarded in the database so a double-click or retry never
// creates two CRM leads or dials twice.
import { getSql } from "./db";
import { pushLeadToCrm, addCallToCrm, notifyCrmNewLead } from "./crm";
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
      // No AI call coming: email Steven now. With a call, the email waits for the results.
      if (crmId && !crmClaim.call_consent) await notifyCrmNewLead(crmId);
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
      // The call never happened, so don't wait for results: email Steven now
      const [row] = (await sql`select crm_lead_id from leads where id = ${id}`) as { crm_lead_id: string | null }[];
      if (row?.crm_lead_id) await notifyCrmNewLead(row.crm_lead_id);
    }
  }
}

// After Retell finishes analyzing the call: put the results on the CRM lead.
// If the lead never reached the CRM (say the first push failed), push it now
// so the call isn't lost. Returns false on failure so the webhook can ask
// Retell to retry; repeating it for the same call never duplicates the note.
export async function syncCallToCrm(id: string, call: Parameters<typeof addCallToCrm>[1]) {
  const sql = getSql();
  if (!process.env.CRM_DATABASE_URL) {
    console.error("CRM call sync skipped: CRM_DATABASE_URL not set");
    await sql`update leads set crm_error = 'CRM_DATABASE_URL not set' where id = ${id}`;
    return true; // retrying can't fix missing config
  }
  try {
    const [lead] = (await sql`select crm_lead_id from leads where id = ${id}`) as {
      crm_lead_id: string | null;
    }[];
    if (!lead) return true;

    let crmId = lead.crm_lead_id;
    if (!crmId) {
      const [claim] = (await sql`
        update leads set crm_synced_at = now()
        where id = ${id} and crm_lead_id is null
          and (crm_synced_at is null or crm_error is not null
               or crm_synced_at < now() - interval '2 minutes')
        returning *
      `) as Row[];
      if (!claim) throw new Error("CRM lead push still in progress");
      crmId = await pushLeadToCrm(claim as never);
      if (!crmId) throw new Error("CRM lead push returned no id");
      await sql`update leads set crm_lead_id = ${crmId}, crm_error = null where id = ${id}`;
    }

    await addCallToCrm(crmId, call);
    await sql`update leads set crm_call_synced_at = now(), crm_error = null where id = ${id}`;
    // Email Steven now that the call summary is on the lead (the CRM sends once per lead)
    await notifyCrmNewLead(crmId);
    return true;
  } catch (err) {
    console.error("CRM call sync failed", err);
    await sql`
      update leads set crm_call_synced_at = null, crm_error = ${`call sync: ${String(err)}`.slice(0, 500)}
      where id = ${id}
    `.catch(() => {});
    return false;
  }
}
