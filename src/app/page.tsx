import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,210,5,0.24),_transparent_30%),linear-gradient(180deg,_#fffef9_0%,_var(--oui-surface)_42%,_#f3efe6_100%)] text-[var(--oui-ink)]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--oui-border)] pb-5">
          <div className="flex items-center gap-4">
            <Image
              src="/oui-logo.png"
              alt="Oduduwa University crest"
              width={72}
              height={72}
              className="h-16 w-16 object-contain sm:h-[72px] sm:w-[72px]"
              priority
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--oui-crimson)]">
                Oduduwa University, Ipetumodu
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--oui-black)] sm:text-4xl">
                RegPortal
              </h1>
            </div>
          </div>
          <span className="hidden rounded-full border border-[var(--oui-border)] bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[var(--oui-ink)] backdrop-blur sm:inline-flex">
            Course registration for every student
          </span>
        </header>

        <div className="grid flex-1 gap-12 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-[color:color-mix(in_srgb,var(--oui-gold)_55%,white)] bg-[color:color-mix(in_srgb,var(--oui-gold)_18%,white)] px-4 py-2 text-sm font-medium text-[var(--oui-black)]">
              Register for your semester courses in a few taps.
            </p>
            <h2 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-[var(--oui-black)] sm:text-6xl">
              Course registration made simple for every Oduduwa University student.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:color-mix(in_srgb,var(--oui-ink)_86%,white)]">
              See the courses you need, add outstanding courses you have to retake, get answers to your questions in plain English, and send everything to your adviser without paperwork.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                className="inline-flex items-center justify-center rounded-full bg-[var(--oui-gold)] px-6 py-3 text-sm font-semibold text-[var(--oui-black)] shadow-[0_16px_40px_rgba(196,30,58,0.10)] hover:-translate-y-0.5 hover:bg-[var(--oui-gold-soft)]"
                href="/login"
              >
                Sign in with your matric number
              </a>
              <a
                className="inline-flex items-center justify-center rounded-full border border-[var(--oui-border)] bg-white/80 px-6 py-3 text-sm font-semibold text-[var(--oui-ink)] hover:border-[var(--oui-gold)] hover:bg-white"
                href="#platform-scope"
              >
                What can RegPortal do?
              </a>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_70px_rgba(20,20,20,0.08)] backdrop-blur sm:p-8">
            <div className="rounded-[1.5rem] border border-[var(--oui-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(250,250,248,0.98))] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--oui-crimson)]">
                Build status
              </p>
              <ul className="mt-5 space-y-4 text-sm leading-6 text-[var(--oui-ink)]">
                <li>Handbook parsed across 7 colleges and 21 departments; seed data + review log written.</li>
                <li>Interactive draft → submit → adviser approval flow with a printable course form.</li>
                <li>Grounded Groq chat, elective insights, violation explainer, and post-submission summary all wired.</li>
              </ul>
            </div>
          </aside>
        </div>

        <section id="platform-scope" className="grid gap-4 border-t border-[var(--oui-border)] py-8 text-sm leading-7 text-[var(--oui-ink)] sm:grid-cols-3">
          <article className="rounded-3xl border border-[var(--oui-border)] bg-white/70 p-5">
            <h3 className="font-semibold text-[var(--oui-black)]">Know what to take</h3>
            <p className="mt-2">RegPortal shows the courses your department expects this semester and warns you if a required course is missing.</p>
          </article>
          <article className="rounded-3xl border border-[var(--oui-border)] bg-white/70 p-5">
            <h3 className="font-semibold text-[var(--oui-black)]">Add carryovers easily</h3>
            <p className="mt-2">If you have any outstanding courses from a previous session, add them alongside your current ones in one place.</p>
          </article>
          <article className="rounded-3xl border border-[var(--oui-border)] bg-white/70 p-5">
            <h3 className="font-semibold text-[var(--oui-black)]">Answers in plain English</h3>
            <p className="mt-2">Ask about electives, requirements or the rules, and RegPortal will explain — using your own record, not guesses.</p>
          </article>
        </section>
      </section>
    </main>
  );
}
