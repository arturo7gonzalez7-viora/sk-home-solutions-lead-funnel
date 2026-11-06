import Image from "next/image";
import LeadForm from "./components/LeadForm";

const TRUST_ITEMS = [
  "Any condition",
  "No fees or commissions",
  "No showings",
  "Close on your timeline",
];

const STEPS = [
  {
    n: "01",
    title: "Tell us about the property",
    body: "Two minutes, right here. Address, condition, and when you want to close.",
  },
  {
    n: "02",
    title: "We reach out quickly",
    body: "A real person from SK Home Solutions reviews the details and reaches out directly.",
  },
  {
    n: "03",
    title: "You get a cash offer",
    body: "No obligation. Accept it, counter it, or walk away. Your call, every step.",
  },
];

const BENEFITS = [
  {
    title: "No repairs, ever",
    body: "We buy homes exactly as they sit. Skip the contractors and the clean-up.",
  },
  {
    title: "No agent, no commission",
    body: "You keep more of the sale price because there's no listing or agent fee.",
  },
  {
    title: "Pick your closing date",
    body: "Close in as little as two weeks, or take the time you need to move out.",
  },
  {
    title: "Backed by a real team",
    body: "SK Home Solutions has closed deals across the Denver metro. This isn't a call center.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col font-sans">
      {/* Header */}
      <header className="border-b border-bone/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/sk-logo.png"
              alt="SK Home Solutions"
              width={34}
              height={34}
              className="h-8 w-8 object-contain"
              priority
            />
            <span className="text-xs font-medium tracking-[0.35em] text-bone uppercase">
              SK Home Solutions
            </span>
          </div>
          <a
            href="#offer"
            className="rounded-full border border-gold/50 px-5 py-2 text-[11px] font-medium tracking-[0.3em] text-gold-light uppercase transition-colors hover:border-gold-light hover:bg-gold/10"
          >
            Get my offer
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="relative flex-1 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--gold), transparent)",
          }}
        />

        <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
          <div className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-12">
            {/* Copy column */}
            <div>
              <p className="gold-text text-xs font-medium tracking-[0.4em] uppercase">
                Quick cash offer
              </p>
              <h1 className="font-display mt-6 text-5xl leading-[1.02] font-normal tracking-[-0.01em] text-bone sm:text-6xl lg:text-[4.5rem]">
                Sell your house on{" "}
                <span className="gold-text italic">your terms</span>, not
                the market&rsquo;s.
              </h1>
              <p className="mt-7 max-w-lg text-base leading-relaxed font-light text-bone/65 sm:text-lg">
                Answer a few questions about your property. SK Home
                Solutions reviews it personally and calls you quickly with a
                real cash offer, with no obligation.
              </p>

              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {TRUST_ITEMS.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span className="text-xs leading-snug text-bone/60 sm:text-sm">
                      {item}
                    </span>
                  </div>
                ))}
              </dl>

              <div className="gold-rule mt-14 hidden h-px w-full lg:block" />

              <ol className="mt-12 hidden space-y-8 lg:block">
                {STEPS.map((step) => (
                  <li key={step.n} className="flex gap-5">
                    <span className="font-display text-3xl text-gold-light/80 italic">
                      {step.n}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-bone">
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm text-bone/50">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Form column */}
            <div id="offer" className="scroll-mt-8 lg:sticky lg:top-10">
              <LeadForm />
            </div>
          </div>

          {/* Steps: mobile only, under the form */}
          <ol className="mt-16 grid gap-6 border-t border-bone/10 pt-12 sm:grid-cols-3 lg:hidden">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="font-display text-2xl text-gold-light/80 italic">
                  {step.n}
                </span>
                <p className="mt-2 text-sm font-semibold text-bone">
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-bone/50">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Benefits */}
        <section className="border-t border-bone/10 bg-walnut-dim/40">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p className="gold-text text-xs font-medium tracking-[0.4em] uppercase">
              Why sellers choose us
            </p>
            <h2 className="font-display mt-5 max-w-2xl text-4xl leading-[1.08] text-bone sm:text-5xl">
              A straightforward way to sell, backed by people who close.
            </h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <div key={b.title}>
                  <div className="h-px w-8 bg-gold" />
                  <p className="mt-4 text-sm font-semibold tracking-wide text-bone uppercase">
                    {b.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-bone/50">
                    {b.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-bone/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <Image
              src="/sk-logo.png"
              alt="SK Home Solutions"
              width={24}
              height={24}
              className="h-6 w-6 object-contain opacity-80"
            />
            <span className="text-xs tracking-wide text-bone/40 uppercase">
              SK Home Solutions
            </span>
          </div>
          <p className="text-xs text-bone/30">
            &copy; 2026 SK Home Solutions. Denver
            metro &amp; surrounding areas.
          </p>
        </div>
      </footer>
    </div>
  );
}
