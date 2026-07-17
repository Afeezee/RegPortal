# RegPortal

AI-assisted course registration platform modelled on Oduduwa University, Ipetumodu.
Undergraduate project — Ariyo Oluwafemi Aquila, U/17/CE/0285.

## Stack

- Next.js 16 App Router · TypeScript · Tailwind CSS 4
- Auth.js (Credentials + JWT sessions)
- Neon Postgres + Drizzle ORM (optional — falls back to demo mode)
- Groq (Llama 3.3 70B) via Vercel AI SDK for grounded assistance
- Framer Motion + Sonner + Lucide icons for UI
- Vitest for the constraint engine

## Running locally

```bash
npm install
cp .env.example .env.local
# Fill in NEXTAUTH_SECRET; DATABASE_URL and GROQ_API_KEY are optional.
npm run dev
```

Open http://localhost:3000. If `DATABASE_URL` is empty, the app runs in demo
mode with in-memory registration state. If `GROQ_API_KEY` is empty, the four
AI features return grounded fallbacks so the UI still works end-to-end.

### Demo logins

| Role | Login ID | Password |
| --- | --- | --- |
| Student | `U/17/CE/0285` | `regportal-demo` |
| Adviser | `adviser.cpe` | `regportal-demo` |
| Admin | `admin.regportal` | `regportal-demo` |

## Feature map

| Layer | Where |
| --- | --- |
| Constraint engine (unit tested) | `src/lib/registration/constraints.ts` |
| Registration state store | `src/lib/registration/store.ts` |
| Server actions (toggle / submit / adviser / window) | `src/lib/portal/actions.ts` |
| Student dashboard + printable receipt | `src/app/student` |
| Adviser approve / query | `src/app/adviser` |
| Admin window + CSV + catalogue | `src/app/admin` |
| AI routes (chat / insight / violation / summary) | `src/app/api/ai/*` |
| Handbook parser + seed extraction | `src/lib/handbook/parser.ts`, `scripts/extract-handbook.ts` |
| Extracted seed + parser review log | `drizzle/seed-data/` |

## Handbook extraction & seeding

```bash
npm run seed:extract    # parses oduduwa_university_handbook_cleaned.md
npm run seed            # loads the parsed JSON into Neon (needs DATABASE_URL)
```

The extractor flags every ambiguous row into
`drizzle/seed-data/handbook-review-log.json` for supervisor sign-off.

## Tests

```bash
npm test
```

Six deterministic tests cover prerequisites, credit under/overload,
already-completed detection, elective-group requirement, and the
department-explicit min/max rule (e.g. Law's 15–24 unit band).

## Deploy

Vercel. Set `DATABASE_URL`, `GROQ_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
