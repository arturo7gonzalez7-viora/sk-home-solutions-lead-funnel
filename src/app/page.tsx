import Image from "next/image";
import LeadForm from "./components/LeadForm";
import MetaPixel from "./components/MetaPixel";

const PERKS = ["Any condition", "No repairs or fees", "Close when you want"];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-ink">
      <MetaPixel />

      <header className="border-b border-ink/8">
        <div className="mx-auto flex max-w-xl items-center gap-2.5 px-4 py-2.5 sm:px-5">
          <Image
            src="/sk-logo.png"
            alt=""
            width={44}
            height={42}
            className="h-7 w-auto"
            priority
          />
          <span className="text-[15px] font-bold tracking-tight">SK Home Solutions</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-5 pb-10 sm:px-5 sm:pt-10">
        <h1 className="text-[1.75rem] leading-[1.1] font-extrabold tracking-tight sm:text-4xl">
          Get a cash offer on your house.
        </h1>
        <p className="mt-2 text-[17px] leading-snug text-ink/70">
          Fill this out in 30 seconds and we&rsquo;ll call you.
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-1.5 text-[15px] font-semibold text-ink/80">
              <svg viewBox="0 0 20 20" className="h-4.5 w-4.5 shrink-0 text-brand" aria-hidden>
                <path d="M4 10.5 8 14.5 16 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <LeadForm />
        </div>
      </main>

      <footer className="border-t border-ink/8 py-5 text-center text-[13px] text-ink/45">
        &copy; 2026 SK Home Solutions &middot; Denver, Colorado
      </footer>
    </div>
  );
}
