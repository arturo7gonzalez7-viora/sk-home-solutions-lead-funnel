// Shared lead constants and types (safe to import from client components).

export const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "under_contract", label: "Under contract" },
  { value: "closed", label: "Closed" },
  { value: "dead", label: "Dead" },
] as const;

// Shown next to the call-permission checkbox and stored word-for-word with
// each lead that checks it. If you change the wording, old leads keep the
// version they actually agreed to.
export const CONSENT_TEXT =
  "I agree that SK Home Solutions may call and text me at the number above about my property and a cash offer, including calls made with automated technology and an AI or prerecorded voice. Consent is not required to sell your home. Msg & data rates may apply. Reply STOP to opt out.";

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
  call_consent?: boolean;
  retell_call_id?: string | null;
  call_status?: string | null;
  call_error?: string | null;
  call_summary?: string | null;
  call_successful?: boolean | null;
  call_recording_url?: string | null;
  crm_lead_id?: string | null;
  crm_error?: string | null;
};

// "Complete" = they reached the contact step and gave a phone number.
export function isComplete(lead: Pick<Lead, "step_completed" | "phone">) {
  return lead.step_completed >= 3 && !!lead.phone;
}
