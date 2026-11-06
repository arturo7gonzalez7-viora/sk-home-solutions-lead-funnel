// Shared lead constants and types (safe to import from client components).

export const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "under_contract", label: "Under contract" },
  { value: "closed", label: "Closed" },
  { value: "dead", label: "Dead" },
] as const;

export type LeadStatus = (typeof STATUSES)[number]["value"];

export const CONDITION_LABELS: Record<string, string> = {
  move_in_ready: "Move-in ready",
  clean_working: "Clean, dated",
  needs_some_work: "Needs some work",
  needs_major_work: "Needs major work",
};

export const TIMELINE_LABELS: Record<string, string> = {
  asap: "ASAP",
  "30_days": "Within 30 days",
  "90_days": "Within 90 days",
  just_looking: "Just exploring",
};

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  estimated_value: string | null;
  condition: string | null;
  reason_for_selling: string | null;
  timeline: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  step_completed: number;
  source: string | null;
  status: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  referrer: string | null;
  landing_url: string | null;
  notes: string | null;
};

// "Complete" = they reached the contact step and gave a phone number.
export function isComplete(lead: Pick<Lead, "step_completed" | "phone">) {
  return lead.step_completed >= 3 && !!lead.phone;
}
