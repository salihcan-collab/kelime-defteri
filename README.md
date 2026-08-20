# Kelime Defteri 📔

A digital-notebook English vocabulary learning app: build vocabulary cards
by hand, with AI, or a hybrid of both; study them with a spaced-repetition
scheduler; and practice with AI-generated quizzes — all in a soft,
customizable notebook UI. It's a small shared app for **up to 2 people**,
each with their own private login and notebook.

## 1. Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One deployable app for UI + API routes; React Server Components keep data fetching simple; trivial to deploy on Vercel, a Node server, or Docker. |
| Database | **SQLite via Prisma ORM** | Zero external services to stand up — the whole app (accounts, cards, tags, SRS state, review history, streaks, AI cache) is one file (`prisma/dev.db`). Swapping to Postgres/Supabase later is a one-line `datasource` change since every field type used is portable. |
| Accounts | **Custom email + password login, capped at 2 accounts** | See §2 below — deliberately minimal since this is a private notebook for you and one other person, not a public app. |
| Styling | **Tailwind CSS + CSS custom properties** | Six notebook color palettes and four font stacks are implemented as CSS variable sets switched via `data-theme` / `data-font` attributes — no rebuild needed to re-theme, and it composes cleanly with Tailwind utilities. |
| Client state | **Zustand (persisted)** | Theme/font/highlight-style/preferences painted instantly from `localStorage` (no flash of wrong theme) and mirrored to the `Settings` table so they survive across browsers too. |
| AI | **OpenAI SDK, server-only** | All calls happen in Next.js Route Handlers so the API key never reaches the browser. Every call uses **Structured Outputs** (`response_format: json_schema`, `strict: true`) so responses are always valid JSON — no retry/repair tokens spent. |
| Pronunciation | **Free dictionary API (dictionaryapi.dev) + Web Speech API** | Real recorded audio and IPA when available, at zero cost; AI is only used as an IPA fallback for words the dictionary doesn't have. Playback uses the browser's built-in `speechSynthesis` — no TTS API bill at all. |

### Why SQLite instead of Supabase/Firebase

The spec offered Supabase/Firebase/SQLite as options. This app serves a
handful of people at most, so a managed multi-tenant database adds
operational overhead — a hosted project, connection strings, RLS policies
— without buying anything the app needs. SQLite gives the same
"persistent progress tracking" requirement (retention data, streaks,
mastered words, full review history) with zero setup. Every table is
already keyed by `userId`, so switching `provider = "postgresql"` in
`prisma/schema.prisma` is the entire migration path to Supabase if this
ever needs to scale past a couple of accounts or move off a single disk
(see §5, "Deploying").

### A note on the requested model name

The spec asks for `gpt-5.6-luna` as the default model. That string isn't
in OpenAI's published model list as of this app's build. Rather than
hard-code a guess, the model is read from a single env var
(`OPENAI_MODEL`, defaulting to `gpt-5.6-luna` exactly as requested) with
an automatic one-time fallback to `OPENAI_FALLBACK_MODEL`
(`gpt-4o-mini` by default) if the primary name is rejected — see
`src/lib/openai.ts`. Update `.env` once you've confirmed the correct
model string for your account; no code changes needed.

## 2. Accounts (2-user login)

There's no public signup. The **first two people** to visit `/signup`
claim the two account slots; after that, signup is closed and shows a
"this notebook is full" message with a link to log in instead. Each
account is a private notebook — cards, tags, settings, and review history
are never shared between the two accounts (the AI cache is the one
exception: word lookups are shared, since a definition doesn't change
depending on who asked).

- **Sign up**: visit `/signup`, enter an email + password (min 8
  characters). No email verification, no password reset — with only two
  trusted accounts sharing one deployment, that's an intentional
  trade-off to keep this simple. If you forget your password, someone
  with server access can clear that user's row and you sign up again.
- **Log in**: `/login`.
- **Log out**: the button next to your email in the top-right nav.
- **Changing the limit**: it's the single constant `MAX_USERS` in
  `src/lib/auth.ts` — raise it if you ever want more than 2 accounts.

Every page and API route requires a session (enforced centrally in
`src/middleware.ts`); logged-out visitors are redirected to `/login`.

## 3. Project structure

```
prisma/
  schema.prisma        # User, Card, ExampleSentence, Tag, ReviewLog, Settings, AICache
  seed.ts               # sample cards for a given account (see below)

src/
  middleware.ts          # gatekeeper: redirects/blocks any request without a session

  app/
    login/, signup/       # public auth pages (outside the account cap check)
    (app)/                 # every authenticated page, wrapped with the Navbar
      page.tsx               # dashboard: streak, due count, daily goal, recent cards
      cards/                 # notebook: browse/search/filter, new, [id] view + edit
      review/                # SRS review session (SM-2)
      quiz/                  # AI + algorithmic practice quizzes
      settings/              # theme / font / highlight-style / preferences
    api/
      auth/                # signup / login / logout / me
      cards/               # CRUD, scoped to the logged-in user
      tags/                # tag autocomplete list, scoped to the logged-in user
      review/              # submit a grade -> SM-2 update + streak
      stats/                # dashboard numbers
      settings/            # get/patch user preferences
      ai/
        generate-card/      # full-card AI draft
        generate-field/     # single-field AI fill (the "modular hybrid" endpoint)
        pronunciation/      # dictionary API lookup + AI IPA fallback
        quiz/                # builds a quiz (half algorithmic, half AI-authored)

  components/
    auth/                 # AuthShell (shared login/signup page chrome)
    ui/                   # Button, Field, Panel/Badge — shared primitives
    vocab/                 # VocabForm, TagInput, AIFieldButton, HighlightedSentence, PronunciationPlayer
    review/                 # ReviewSession, RatingButtons
    quiz/                    # QuizRunner, QuizQuestionView (4 question types)
    settings/                 # ThemePicker, FontPicker, HighlightStylePicker, PreferenceSliders
    layout/                    # Navbar, ThemeProvider

  lib/
    auth.ts         requireSession.ts   prisma.ts      srs.ts
    streak.ts        highlight.ts        openai.ts      ai.ts
    dictionary.ts    cache.ts             quiz.ts        validation.ts
    settings.ts

  store/settingsStore.ts   # zustand, persisted, theme/font/highlight/preferences
  hooks/useTTS.ts           # Web Speech API playback
  types/index.ts             # shared types incl. enum-like unions (see note below)
```

## 4. Feature-to-code map

- **Highlighting system** (Bold / Underline / Color / Bold+Underline, default
  Bold+Underline): `lib/highlight.ts` computes character-offset spans for
  the target word inside each example sentence at save time (handles
  simple inflections like *run → running*); `components/vocab/HighlightedSentence.tsx`
  renders them per the style chosen in Settings.
- **Modular hybrid AI card creation**: `components/vocab/AIFieldButton.tsx`
  sits next to every individual field and calls
  `POST /api/ai/generate-field` for just that field; "Generate full card
  with AI" calls `POST /api/ai/generate-card` once. Both are safe to mix —
  AI never overwrites a field you didn't ask it to touch.
- **Pronunciation**: `PronunciationPlayer` plays a real recorded clip when
  the free dictionary API has one, otherwise falls back to
  `speechSynthesis`; IPA is looked up the same way with AI as a last resort.
- **SRS**: `lib/srs.ts` is an SM-2 variant adapted to four Anki-style grades
  (Again/Hard/Good/Easy) instead of raw 0-5 quality — see the file's doc
  comment for the exact formula and mastery threshold.
- **Quizzes**: `lib/quiz.ts` builds multiple-choice and recall questions
  algorithmically from your own card bank (zero AI cost); `lib/ai.ts`
  generates the fill-in-the-blank and sentence-construction questions,
  which genuinely need generated text. `api/ai/quiz` splits a batch
  between the two so AI spend stays proportional to what actually needs it.
- **Cost/token optimization**: every AI call goes through
  `callStructured()` (`lib/openai.ts`), which enforces JSON Schema
  Structured Outputs, and through `getCached`/`setCached` (`lib/cache.ts`),
  a persistent cache keyed by a hash of `(kind, input)` in the `AICache`
  table — the same word/field is never billed twice, shared across both
  accounts.
- **Accounts**: `lib/auth.ts` (password hashing with `bcryptjs`, signed
  session cookies with `jose`) + `middleware.ts` (gatekeeper) + `api/auth/*`
  (signup/login/logout). See §2 above.

## 5. Getting started

```bash
npm install
cp .env.example .env
# fill in AUTH_SECRET (required — generate with `openssl rand -base64 32`)
# fill in OPENAI_API_KEY to enable AI features (optional)
npm run db:push              # create the SQLite schema
npm run dev                  # http://localhost:3000
```

Then open the app, go to `/signup`, and create your account (and a second
one for whoever else you're sharing this with, if anyone). Once at least
one account exists, you can optionally run `npm run db:seed` to drop a
few sample cards into the first account's notebook (or
`npm run db:seed -- you@example.com` to target a specific one) — useful
for exploring the UI without typing anything in by hand.

The app is fully usable with **no OpenAI key at all** — every AI button
disables itself with an explanatory tooltip, pronunciation still works via
the free dictionary API + Web Speech, and quizzes fall back to fully
algorithmic questions. Set `OPENAI_API_KEY` (and double-check
`OPENAI_MODEL`) whenever you want AI-assisted card filling and contextual
quiz questions.

### Deploying so you can actually use it day-to-day

This was built and tested locally. To get a real URL you and the second
account holder can open from your phones/laptops, the simplest options are:

- **A small always-on host with persistent disk** (Render, Railway,
  Fly.io, a cheap VPS): straightforward, since the SQLite file just lives
  on disk like it does here. Point `DATABASE_URL` at a persistent volume,
  set `AUTH_SECRET` and (optionally) `OPENAI_API_KEY`/`OPENAI_MODEL` as
  environment variables, run `npm run build && npm run start`.
- **Vercel**: works great for the Next.js app itself, but its serverless
  functions don't have a persistent local filesystem — a SQLite file
  won't reliably survive between requests there. If you want Vercel,
  switch the Prisma `datasource` to a hosted Postgres (e.g. Vercel
  Postgres or Supabase) first; that's the one piece of this app that
  assumes a writable local disk.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | standard Next.js dev/build/serve |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:push` | sync `prisma/schema.prisma` to the SQLite file |
| `npm run db:seed [-- email]` | insert sample vocabulary cards for an account |

## 6. Known limitations / next steps

- Capped at 2 accounts by design (see §2) — raising `MAX_USERS` in
  `src/lib/auth.ts` is the whole change if you want more.
- No password reset flow. With just two trusted accounts, losing a
  password means asking whoever has server/DB access to clear that user's
  row so you can sign up again.
- Inflection-aware highlighting (`lib/highlight.ts`) is prefix-based, not a
  real stemmer, so irregular forms ("go" → "went") won't auto-highlight;
  the stored `highlightSpans` can always be hand-corrected per sentence.
- The free dictionary API only covers single English words well;
  multi-word phrases (phrasal verbs, idioms) usually fall through to the
  AI IPA fallback or manual entry.
