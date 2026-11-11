import Image from "next/image";
import LeadForm from "./components/LeadForm";
import MetaPixel from "./components/MetaPixel";

const TRUST_ITEMS = [
  "Any condition",
  "No fees or commissions",
  "No showings",
  "Close on your timeline",
];

const STEPS = [
  { n: "01", title: "Tell us", body: "Two minutes, right here." },
  { n: "02", title: "We call", body: "Steven’s assistant gets in touch." },
  { n: "03", title: "Steven reviews", body: "Discuss your options, no obligation." },
];

export default function Home() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden font-sans lg:h-dvh">
      <MetaPixel />
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-[30%] -left-[15%] h-[85vh] w-[70vw] rounded-full opacity-[0.22] blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--gold), transparent)" }}
        />
        <div
          className="absolute -right-[10%] -bottom-[30%] h-[80vh] w-[60vw] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--walnut), transparent)" }}
        />
        <Image
          src="/sk-logo.png"
          alt=""
          width={719}
          height={691}
          className="absolute -bottom-[18%] -left-[6%] hidden w-[46vw] max-w-[760px] opacity-[0.045] lg:block"
          priority
        />
        <div className="grain absolute inset-0" />
      </div>

      {/* Gallery frame */}
      <div aria-hidden className="pointer-events-none absolute inset-2.5 border border-gold/15 sm:inset-4">
        {["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r", "-bottom-px -left-px border-b border-l", "-bottom-px -right-px border-b border-r"].map((pos) => (
          <span key={pos} className={`absolute h-4 w-4 border-gold-light/70 ${pos}`} />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-5 sm:px-12 sm:pt-9 short:sm:pt-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Image
              src="/sk-logo.png"
              alt="SK Home Solutions"
              width={44}
              height={42}
              className="h-8 w-auto object-contain sm:h-10"
              priority
            />
            <div className="leading-none">
              <p className="font-display text-[13px] font-medium tracking-[0.3em] text-bone uppercase sm:text-[15px]">
                SK Home Solutions
              </p>
              <p className="mt-1.5 text-[9px] font-medium tracking-[0.42em] text-gold-light/70 uppercase">
                Private home buyers
              </p>
            </div>
          </div>
          <p className="hidden text-[10px] font-medium tracking-[0.4em] text-bone/45 uppercase md:block">
            Denver Metro <span className="mx-2 text-gold/60">&#9670;</span> Colorado
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 items-center px-6 py-4 sm:px-12 sm:py-6 lg:min-h-0 lg:py-4">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-5 sm:gap-8 lg:grid-cols-[1.08fr_auto_0.92fr] lg:gap-14 xl:gap-20">
          {/* Copy */}
          <section className="rise">
            <div className="hidden items-center gap-4 sm:flex">
              <span className="gold-rule h-px w-10" />
              <p className="text-[10px] font-semibold tracking-[0.45em] text-gold-light uppercase sm:text-[11px]">
                Your private cash offer
              </p>
            </div>

            <h1 className="font-display text-[2.35rem] leading-[1.02] font-light tracking-[-0.03em] text-bone sm:mt-7 sm:text-6xl lg:text-[4.6rem] xl:text-[5.4rem] short:lg:text-[3.9rem] short:xl:text-[4.4rem]">
              Sell your home
              <br />
              on <span className="gold-text font-medium">your</span> terms.
            </h1>

            <p className="mt-5 hidden max-w-md text-[15px] leading-relaxed font-light text-bone/60 sm:block lg:mt-7 short:lg:mt-5">
              No repairs, no agents, no showings. Tell us about the property.
              Steven&rsquo;s assistant will get in touch, then Steven will review
              the details and discuss a potential cash offer with you.
            </p>

            <ol className="mt-10 hidden max-w-lg grid-cols-3 gap-6 border-t border-bone/10 pt-7 lg:grid short:lg:mt-7 short:lg:pt-5">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="font-display text-xl font-light text-gold-light/80">{s.n}</span>
                  <p className="mt-1.5 text-[11px] font-semibold tracking-[0.22em] text-bone uppercase">
                    {s.title}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-bone/45">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Divider */}
          <div aria-hidden className="gold-rule-v hidden h-[62%] w-px self-center opacity-60 lg:block" />

          {/* Form */}
          <section id="offer" className="rise [animation-delay:150ms]">
            <LeadForm />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 pb-7 sm:px-12 sm:pb-9 short:sm:pb-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-bone/10 pt-4 sm:flex-row">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-x-5">
            {TRUST_ITEMS.map((item, i) => (
              <li key={item} className="flex items-center gap-5 text-[10px] font-medium tracking-[0.28em] text-bone/55 uppercase">
                {i > 0 && <span className="hidden text-[7px] text-gold/70 sm:inline">&#9670;</span>}
                {item}
              </li>
            ))}
          </ul>
          <p className="text-[10px] tracking-[0.2em] text-bone/30 uppercase">
            &copy; 2026 SK Home Solutions
          </p>
        </div>
      </footer>
    </div>
  );
}
