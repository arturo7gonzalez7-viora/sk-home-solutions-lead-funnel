"use client";

import { useState } from "react";
import { CONSENT_TEXT } from "@/lib/lead-meta";

type Condition =
  | "move_in_ready"
  | "clean_working"
  | "needs_some_work"
  | "needs_major_work";

type Timeline = "asap" | "30_days" | "90_days" | "just_looking";

const CONDITIONS: { value: Condition; label: string; blurb: string }[] = [
  {
    value: "move_in_ready",
    label: "Move-in ready",
    blurb: "Clean and working. Could list it today.",
  },
  {
    value: "clean_working",
    label: "Clean, dated",
    blurb: "Everything works, but it's a bit behind the times.",
  },
  {
    value: "needs_some_work",
    label: "Needs some work",
    blurb: "Kitchen, bath, roof, or HVAC due soon.",
  },
  {
    value: "needs_major_work",
    label: "Needs major work",
    blurb: "Damage, gutted, foundation or code issues.",
  },
];

const TIMELINES: { value: Timeline; label: string }[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "30_days", label: "Within 30 days" },
  { value: "90_days", label: "Within 90 days" },
  { value: "just_looking", label: "Just exploring options" },
];

const STEP_LABELS = ["Property", "Timeline", "Contact"];

const TRACKING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

// Where did this visitor come from? Reads the ad link's UTM tags and
// Facebook click id, and remembers the first values seen this visit so a
// reload without them still credits the ad.
function getTracking(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  let saved: Record<string, string | null> = {};
  try {
    saved = JSON.parse(sessionStorage.getItem("sk_tracking") ?? "{}");
  } catch {}
  if (TRACKING_KEYS.some((k) => params.get(k))) {
    saved = {
      ...Object.fromEntries(TRACKING_KEYS.map((k) => [k, params.get(k)])),
      referrer: document.referrer || null,
      landing_url: window.location.href,
    };
    try {
      sessionStorage.setItem("sk_tracking", JSON.stringify(saved));
    } catch {}
  }
  return {
    referrer: document.referrer || null,
    landing_url: window.location.href,
    ...saved,
  };
}

async function saveLead(payload: Record<string, unknown>) {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("save_failed");
  return res.json() as Promise<{ id: string }>;
}

export default function LeadForm() {
  const [step, setStep] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [condition, setCondition] = useState<Condition | "">("");
  const [timeline, setTimeline] = useState<Timeline | "">("");
  const [reason, setReason] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [callConsent, setCallConsent] = useState(false);

  const advance = async (nextStep: number, extra: Record<string, unknown>) => {
    setError(null);
    setSubmitting(true);
    try {
      const { id } = await saveLead({
        id: leadId ?? undefined,
        step_completed: step,
        ...(leadId ? {} : getTracking()),
        ...extra,
      });
      setLeadId(id);
      setStep(nextStep);
    } catch {
      setError("Something went wrong saving that. Mind trying again?");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFinal = async () => {
    if (!fullName || !phone) {
      setError("We need your name and phone number to call you back.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await saveLead({
        id: leadId ?? undefined,
        full_name: fullName,
        phone,
        email,
        call_consent: callConsent,
        step_completed: 3,
      });
      setDone(true);
    } catch {
      setError("Something went wrong submitting. Mind trying again?");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="relative border border-gold/30 bg-eclipse/55 px-8 py-14 text-center backdrop-blur-md sm:px-12">
        <span className="gold-rule absolute inset-x-0 top-0 h-px" />
        <p className="text-[10px] font-semibold tracking-[0.45em] text-gold-light uppercase">
          You&rsquo;re all set
        </p>
        <h3 className="font-display mt-5 text-4xl font-light tracking-[-0.02em] text-bone sm:text-5xl">
          Thank you, <span className="gold-text font-medium">{fullName.split(" ")[0] || "friend"}</span>.
        </h3>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed font-light text-bone/65">
          A member of the SK Home Solutions team will call you shortly
          with next steps and your cash offer.
        </p>
      </div>
    );
  }

  const label =
    "block text-[10px] font-semibold tracking-[0.3em] text-bone/50 uppercase";
  const optional = (
    <span className="ml-1 font-normal tracking-[0.15em] text-bone/30 normal-case">
      optional
    </span>
  );
  const choice = (selected: boolean) =>
    `group relative border px-3.5 py-2.5 text-left sm:px-4 sm:py-3 transition-all duration-200 short:py-2.5 ${
      selected
        ? "border-gold-light/80 bg-gold/[0.09]"
        : "border-bone/12 hover:border-bone/30 hover:bg-bone/[0.02]"
    }`;
  const primary =
    "btn-gold flex-1 py-3.5 sm:py-4 text-[11px] font-bold tracking-[0.32em] text-eclipse uppercase disabled:cursor-not-allowed disabled:opacity-35 short:py-3.5";
  const back =
    "border border-bone/15 px-5 text-[11px] font-semibold tracking-[0.25em] text-bone/60 uppercase transition-colors hover:border-bone/35 hover:text-bone";

  return (
    <div className="relative border border-bone/10 bg-eclipse/55 px-5 py-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-md sm:px-9 sm:py-9 short:sm:py-7">
      <span className="gold-rule absolute inset-x-0 top-0 h-px" />

      {/* Header + progress */}
      <div className="mb-5 sm:mb-7 short:mb-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[1.5rem] leading-none font-light tracking-[-0.01em] text-bone sm:text-3xl">
            {step === 1 && <>The <span className="font-medium text-gold-light">property</span></>}
            {step === 2 && <>Your <span className="font-medium text-gold-light">timeline</span></>}
            {step === 3 && <>Where to <span className="font-medium text-gold-light">reach you</span></>}
          </h2>
          <p className="text-[10px] font-semibold tracking-[0.35em] text-bone/40 uppercase">
            <span className="text-gold-light">0{step}</span> / 03
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:mt-5">
          {STEP_LABELS.map((l, i) => (
            <span
              key={l}
              className={`h-[2px] transition-colors duration-500 ${
                i + 1 <= step ? "bg-gold-light" : "bg-bone/10"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4 sm:space-y-5 short:space-y-4">
          <div>
            <label className={label}>Property address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              autoComplete="street-address"
              className="field"
            />
          </div>
          <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr] gap-4">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" autoComplete="address-level2" className="field" />
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" autoComplete="address-level1" className="field" />
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" inputMode="numeric" autoComplete="postal-code" className="field" />
          </div>
          <div>
            <label className={`${label} mb-2.5`}>Condition</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button type="button" key={c.value} onClick={() => setCondition(c.value)} className={choice(condition === c.value)}>
                  <p className="text-[12.5px] font-semibold whitespace-nowrap text-bone sm:text-[13px]">{c.label}</p>
                  <p className="mt-0.5 hidden text-[11px] leading-snug text-bone/45 sm:block short:hidden">{c.blurb}</p>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex pt-1">
            <button
              type="button"
              disabled={!address || !condition || submitting}
              onClick={() =>
                advance(2, { address, city, state, zip, condition })
              }
              className={primary}
            >
              {submitting ? "Saving…" : "Continue →"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 short:space-y-5">
          <div>
            <label className={`${label} mb-2.5`}>How soon do you want to sell?</label>
            <div className="grid grid-cols-2 gap-2">
              {TIMELINES.map((t) => (
                <button type="button" key={t.value} onClick={() => setTimeline(t.value)} className={choice(timeline === t.value)}>
                  <p className="text-[12.5px] font-semibold text-bone sm:text-[13px]">{t.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Estimated value {optional}</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-bone/40">$</span>
              <input
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="I'm not sure"
                inputMode="numeric"
                className="field pl-4!"
              />
            </div>
          </div>
          <div>
            <label className={label}>What&rsquo;s prompting the move? {optional}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Relocating, inherited, behind on payments, tired landlord…"
              rows={2}
              className="field resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setStep(1)} className={back}>Back</button>
            <button
              type="button"
              disabled={!timeline || submitting}
              onClick={() =>
                advance(3, {
                  timeline,
                  reason_for_selling: reason,
                  estimated_value: estimatedValue ? Number(estimatedValue) : null,
                })
              }
              className={primary}
            >
              {submitting ? "Saving…" : "Continue →"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 sm:space-y-5 short:space-y-4">
          <div>
            <label className={label}>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" autoComplete="name" className="field" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={label}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(303) 555-0123" type="tel" autoComplete="tel" className="field" />
            </div>
            <div>
              <label className={label}>Email {optional}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@email.com" type="email" autoComplete="email" className="field" />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 select-none">
            <input
              type="checkbox"
              checked={callConsent}
              onChange={(e) => setCallConsent(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-1 peer-focus-visible:ring-gold-light ${
                callConsent ? "border-gold-light bg-gold-light" : "border-bone/30"
              }`}
            >
              {callConsent && (
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-eclipse">
                  <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </span>
            <span className="text-[11px] leading-relaxed text-bone/55">
              <span className="font-semibold text-bone/85">Yes, call me about my cash offer. </span>
              {CONSENT_TEXT}
            </span>
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className={back}>Back</button>
            <button type="button" disabled={submitting} onClick={submitFinal} className={primary}>
              {submitting ? "Submitting…" : "Get my cash offer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
