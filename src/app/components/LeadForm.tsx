"use client";

import { useRef, useState } from "react";
import { CONSENT_TEXT } from "@/lib/lead-meta";
import { trackLead } from "@/lib/meta-pixel";

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
      // The existing Meta ads use utm_ad for the creative name.
      utm_content: params.get("utm_content") ?? params.get("utm_ad"),
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

const digits = (s: string) => s.replace(/\D/g, "");

const CONDITIONS = [
  { value: "move_in_ready", label: "Move-in ready" },
  { value: "clean_working", label: "Good, a bit dated" },
  { value: "needs_some_work", label: "Needs some work" },
  { value: "needs_major_work", label: "Needs major work" },
] as const;

const TIMELINES = [
  { value: "asap", label: "ASAP" },
  { value: "30_days", label: "Within 30 days" },
  { value: "90_days", label: "1 to 3 months" },
  { value: "just_looking", label: "Just exploring" },
] as const;

function Choices({
  label,
  options,
  value,
  onChange,
  missing,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  missing: boolean;
}) {
  return (
    <fieldset>
      <legend className={`mb-1.5 block text-[15px] font-bold ${missing ? "text-red-600" : "text-ink"}`}>
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`rounded-xl border-2 px-3 py-3 text-[15px] leading-tight font-semibold transition-colors ${
                on
                  ? "border-brand bg-brand text-white"
                  : missing
                    ? "border-red-300 bg-white text-ink hover:border-red-400"
                    : "border-ink/15 bg-white text-ink hover:border-brand/50"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const fieldClass =
  "block w-full rounded-xl border-2 border-ink/15 bg-white px-4 py-3 text-[17px] text-ink placeholder:text-ink/35 transition-colors focus:border-brand focus:outline-none";
const labelClass = "mb-1.5 block text-[15px] font-bold text-ink";

export default function LeadForm() {
  const [address, setAddress] = useState("");
  const [condition, setCondition] = useState("");
  const [timeline, setTimeline] = useState("");
  const [tried, setTried] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [callConsent, setCallConsent] = useState(false);
  const [remindConsent, setRemindConsent] = useState(false);
  const [shake, setShake] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const consentRef = useRef<HTMLLabelElement>(null);

  const submit = async (skipCall = false) => {
    setError(null);
    setTried(true);
    if (!address.trim()) return setError("Please enter the property address.");
    if (!condition) return setError("Please pick the property's condition.");
    if (!timeline) return setError("Please pick when you'd like to sell.");
    if (!fullName.trim()) return setError("Please enter your name.");
    const d = digits(phone);
    if (d.length < 10 || d.length > 11) return setError("Please enter a valid phone number.");

    // Unchecked call box: point at it once before sending without a call.
    if (!callConsent && !skipCall && !remindConsent) {
      setRemindConsent(true);
      setShake((n) => n + 1);
      consentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      await saveLead({
        ...getTracking(),
        address: address.trim(),
        condition,
        timeline,
        full_name: fullName.trim(),
        phone: phone.trim(),
        call_consent: callConsent,
        step_completed: 3,
      });
      trackLead();
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const first = fullName.trim().split(/\s+/)[0];
    return (
      <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint px-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white">
          <svg viewBox="0 0 20 20" className="h-7 w-7" aria-hidden>
            <path d="M4 10.5 8 14.5 16 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight">
          Thanks{first ? `, ${first}` : ""}! You&rsquo;re all set.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[17px] leading-snug text-ink/70">
          {callConsent
            ? "Keep your phone close. We’ll be calling you shortly about your cash offer."
            : "We got your info. Steven’s team will review your property and reach out soon."}
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_10px_40px_-12px_rgba(22,24,29,0.18)] sm:p-7"
    >
      <div className="space-y-3.5">
        <div>
          <label htmlFor="address" className={labelClass}>Property address</label>
          <input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Denver"
            autoComplete="street-address"
            enterKeyHint="next"
            className={fieldClass}
          />
        </div>
        <Choices
          label="Property condition"
          options={CONDITIONS}
          value={condition}
          onChange={setCondition}
          missing={tried && !condition}
        />
        <Choices
          label="When do you want to sell?"
          options={TIMELINES}
          value={timeline}
          onChange={setTimeline}
          missing={tried && !timeline}
        />
        <div>
          <label htmlFor="name" className={labelClass}>Your name</label>
          <input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="First and last name"
            autoComplete="name"
            enterKeyHint="next"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>Phone number</label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(303) 555-0123"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="done"
            className={fieldClass}
          />
        </div>

        {/* Call permission: big, obvious, and never pre-checked. */}
        <label
          key={shake}
          ref={consentRef}
          className={`block cursor-pointer rounded-xl border-2 p-4 transition-colors ${
            callConsent
              ? "border-brand bg-brand-tint"
              : remindConsent
                ? "nudge border-red-500 bg-red-50"
                : "border-brand/60 bg-brand-tint"
          }`}
        >
          <span className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={callConsent}
              onChange={(e) => {
                setCallConsent(e.target.checked);
                if (e.target.checked) setRemindConsent(false);
              }}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 ${
                callConsent
                  ? "border-brand bg-brand text-white"
                  : remindConsent
                    ? "border-red-500 bg-white"
                    : "border-brand bg-white"
              }`}
            >
              {callConsent && (
                <svg viewBox="0 0 20 20" className="h-5 w-5">
                  <path d="M4 10.5 8 14.5 16 6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              <span className="block text-[17px] leading-snug font-bold text-ink">
                Yes, call me with my cash offer
              </span>
              <span className="mt-0.5 block text-[14px] font-semibold text-brand-dark">
                Check this box so we can call you
              </span>
            </span>
          </span>
          <span className="mt-2.5 block text-[11.5px] leading-snug text-ink/50">{CONSENT_TEXT}</span>
        </label>

        {remindConsent && !callConsent && (
          <p className="text-[15px] leading-snug font-semibold text-red-600">
            Check the box above so we can call you with your offer.{" "}
            <button
              type="button"
              onClick={() => submit(true)}
              className="font-medium text-ink/55 underline underline-offset-2"
            >
              Submit without a call
            </button>
          </p>
        )}

        {error && <p className="text-[15px] font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="block w-full rounded-xl bg-brand py-4 text-[18px] font-extrabold text-white shadow-[0_6px_18px_-6px_rgba(143,102,49,0.7)] transition-colors hover:bg-brand-dark active:translate-y-px disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Get My Cash Offer"}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[13px] text-ink/50">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
            <path d="M6 9V6.5a4 4 0 1 1 8 0V9M5 9h10v8H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Private and secure. No obligation.
        </p>
      </div>
    </form>
  );
}
