import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

export function getSql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

// Creates the leads table and adds any newer columns. Safe to run repeatedly,
// so a fresh database or an older one both end up with the same shape.
async function migrate() {
  const sql = getSql();
  await sql`
    create table if not exists leads (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      address text, city text, state text, zip text,
      estimated_value numeric,
      condition text,
      reason_for_selling text,
      timeline text,
      full_name text, phone text, email text,
      step_completed int not null default 1,
      source text,
      status text not null default 'new'
    )
  `;
  await sql`
    alter table leads
      add column if not exists utm_source text,
      add column if not exists utm_medium text,
      add column if not exists utm_campaign text,
      add column if not exists utm_content text,
      add column if not exists utm_term text,
      add column if not exists fbclid text,
      add column if not exists referrer text,
      add column if not exists landing_url text,
      add column if not exists notes text
  `;
  // Call consent + Retell AI call + CRM sync tracking.
  await sql`
    alter table leads
      add column if not exists call_consent boolean not null default false,
      add column if not exists consent_text text,
      add column if not exists consent_at timestamptz,
      add column if not exists consent_ip text,
      add column if not exists consent_user_agent text,
      add column if not exists call_requested_at timestamptz,
      add column if not exists retell_call_id text,
      add column if not exists call_status text,
      add column if not exists call_error text,
      add column if not exists call_ended_reason text,
      add column if not exists call_summary text,
      add column if not exists call_successful boolean,
      add column if not exists call_sentiment text,
      add column if not exists call_analysis jsonb,
      add column if not exists call_transcript text,
      add column if not exists call_recording_url text,
      add column if not exists crm_lead_id text,
      add column if not exists crm_synced_at timestamptz,
      add column if not exists crm_call_synced_at timestamptz,
      add column if not exists crm_error text
  `;
  await sql`create index if not exists leads_created_at_idx on leads (created_at desc)`;
  await sql`create index if not exists leads_status_idx on leads (status)`;
}

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = migrate().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
