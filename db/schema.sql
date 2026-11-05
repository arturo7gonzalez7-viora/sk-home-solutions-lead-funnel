-- Seller lead capture schema
-- Captures every step of the funnel as the person fills it in, not just on final submit,
-- so a half-finished form is still a recoverable lead.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- step 1: property
  address text,
  city text,
  state text,
  zip text,
  estimated_value numeric,
  condition text, -- 'move_in_ready' | 'clean_working' | 'needs_some_work' | 'needs_major_work'

  -- step 2: reason / timeline (swap in whatever you decide the real flow asks)
  reason_for_selling text,
  timeline text, -- 'asap' | '30_days' | '90_days' | 'just_looking'

  -- step 3: contact
  full_name text,
  phone text,
  email text,

  -- funnel tracking
  step_completed int not null default 1, -- highest step the person reached
  source text, -- utm_source / ad campaign name
  status text not null default 'new' -- 'new' | 'contacted' | 'offer_sent' | 'closed' | 'dead'
);

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists leads_status_idx on leads (status);
