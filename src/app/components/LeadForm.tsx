"use client";

import { useState } from "react";

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
      <div className="rounded-2xl border border-gold-deep/40 bg-walnut/60 p-8 text-center sm:p-12">
        <p className="text-xs font-medium tracking-[0.4em] text-gold-light uppercase">
          You&rsquo;re all set
        </p>
        <h3 className="font-display mt-4 text-3xl text-bone sm:text-4xl">
          Thanks, {fullName.split(" ")[0] || "there"}.
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-sm text-bone/70">
          A member of the SK Home Solutions team will call you shortly
          with next steps and your cash offer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-bone/10 bg-walnut/60 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur sm:p-8">
      {/* step indicator */}
      <div className="mb-8 flex items-center gap-3">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const complete = n < step;
          return (
            <div key={label} className="flex flex-1 items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                    complete
                      ? "bg-gold text-eclipse"
                      : active
                      ? "border border-gold text-gold-light"
                      : "border border-bone/20 text-bone/40"
                  }`}
                >
                  {n}
                </span>
                <span
                  className={`hidden text-xs tracking-wide uppercase sm:inline ${
                    active ? "text-bone" : "text-bone/40"
                  }`}
                >
                  {label}
                </span>
              </div>
              {n < STEP_LABELS.length && (
                <span className="h-px flex-1 bg-bone/10" />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs tracking-wide text-bone/60 uppercase">
              Property address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full rounded-lg border border-bone/15 bg-eclipse/60 px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="col-span-1 rounded-lg border border-bone/15 bg-eclipse/60 px-3 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
            />
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className="col-span-1 rounded-lg border border-bone/15 bg-eclipse/60 px-3 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
            />
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP"
              className="col-span-1 rounded-lg border border-bone/15 bg-eclipse/60 px-3 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs tracking-wide text-bone/60 uppercase">
              Estimated value{" "}
              <span className="text-bone/30 normal-case">(optional)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-bone/40">
                $
              </span>
              <input
                value={estimatedValue}
                onChange={(e) =>
                  setEstimatedValue(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="I'm not sure"
                inputMode="numeric"
                className="w-full rounded-lg border border-bone/15 bg-eclipse/60 py-3 pr-4 pl-8 text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs tracking-wide text-bone/60 uppercase">
              Condition
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CONDITIONS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCondition(c.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    condition === c.value
                      ? "border-gold bg-gold/10"
                      : "border-bone/15 hover:border-bone/30"
                  }`}
                >
                  <p className="text-sm font-medium text-bone">{c.label}</p>
                  <p className="mt-0.5 text-xs text-bone/50">{c.blurb}</p>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="button"
            disabled={!address || !condition || submitting}
            onClick={() =>
              advance(2, {
                address,
                city,
                state,
                zip,
                estimated_value: estimatedValue ? Number(estimatedValue) : null,
                condition,
              })
            }
            className="w-full rounded-lg bg-gradient-to-r from-gold-light via-gold to-gold-deep py-3.5 text-sm font-semibold tracking-wide text-eclipse uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Saving..." : "Next: Timeline"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs tracking-wide text-bone/60 uppercase">
              How soon do you want to sell?
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TIMELINES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setTimeline(t.value)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    timeline === t.value
                      ? "border-gold bg-gold/10 text-bone"
                      : "border-bone/15 text-bone/80 hover:border-bone/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs tracking-wide text-bone/60 uppercase">
              What&rsquo;s prompting the move?{" "}
              <span className="text-bone/30 normal-case">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Relocating, inherited property, behind on payments, tired landlord..."
              rows={3}
              className="w-full resize-none rounded-lg border border-bone/15 bg-eclipse/60 px-4 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-bone/20 px-5 py-3.5 text-sm text-bone/70 hover:border-bone/40"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!timeline || submitting}
              onClick={() =>
                advance(3, { timeline, reason_for_selling: reason })
              }
              className="flex-1 rounded-lg bg-gradient-to-r from-gold-light via-gold to-gold-deep py-3.5 text-sm font-semibold tracking-wide text-eclipse uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Saving..." : "Next: Contact"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs tracking-wide text-bone/60 uppercase">
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full rounded-lg border border-bone/15 bg-eclipse/60 px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs tracking-wide text-bone/60 uppercase">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(303) 555-0123"
                type="tel"
                className="w-full rounded-lg border border-bone/15 bg-eclipse/60 px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs tracking-wide text-bone/60 uppercase">
                Email{" "}
                <span className="text-bone/30 normal-case">(optional)</span>
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@email.com"
                type="email"
                className="w-full rounded-lg border border-bone/15 bg-eclipse/60 px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-bone/40">
            By submitting, you agree to be contacted by SK Home Solutions
            about your property by phone, text, or email.
          </p>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-bone/20 px-5 py-3.5 text-sm text-bone/70 hover:border-bone/40"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submitFinal}
              className="flex-1 rounded-lg bg-gradient-to-r from-gold-light via-gold to-gold-deep py-3.5 text-sm font-semibold tracking-wide text-eclipse uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Submitting..." : "Get My Cash Offer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
