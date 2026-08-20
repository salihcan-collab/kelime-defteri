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
| Database | **Postgres via Prisma ORM** | Works with any standard Postgres — Render's free managed database (see §5, "Deploying"), Supabase, Neon, or a local instance for development. No SQLite-specific behavior anywhere in the schema, so this is also a one-line `datasource` change away from other Postgres-compatible providers. |
| Accounts | **Custom email + password login, capped at 2 accounts** | See §2 below — deliberately minimal since this is a private notebook for you and one other person, not a public app. |
| Styling | **Tailwind CSS + CSS custom properties** | Six notebook color palettes and four font stacks are implemented as CSS variable sets switched via `data-theme` / `data-font` attributes — no rebuild needed to re-theme, and it composes cleanly with Tailwind utilities. |
| Client state | **Zustand (persisted)** | Theme/font/highlight-style/preferences painted instantly from `localStorage` (no flash of wrong theme) and mirrored to the `Settings` table so they survive across browsers too. |
| AI | **OpenAI SDK, server-only** | All calls happen in Next.js Route Handlers so the API key never reaches the browser. Every call uses **Structured Outputs** (`response_format: json_schema`, `strict: true`) so responses are always valid JSON — no retry/repair tokens spent. |
| Pronunciation | **Free dictionary API (dictionaryapi.dev) + Web Speech API** | Real recorded audio and IPA when available, at zero cost; AI is only used as an IPA fallback for words the dictionary doesn't have. Playback uses the browser's built-in `speechSynthesis` — no TTS API bill at all. |

### Why Postgres instead of Supabase's full BaaS layer

The spec offered Supabase/Firebase/SQLite as options. This app doesn't
need Supabase's auth, storage, or realtime layers — just a reliable place
to persist "progress tracking" (retention data, streaks, mastered words,
full review history) for at most two accounts. Plain Postgres via Prisma
gets that with no extra product surface to learn, while still deploying
for free on Render's managed database (see §5). Every table is already
keyed by `userId`, and the schema uses no Postgres-specific column types,
so pointing `DATABASE_URL` at Supabase's own Postgres later — to pick up
its auth/storage/realtime features — is a config change, not a rewrite.

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
# point DATABASE_URL at a Postgres instance (local, Docker, or a free
# hosted one — see the comment in .env.example)
# fill in AUTH_SECRET (required — generate with `openssl rand -base64 32`)
# fill in OPENAI_API_KEY to enable AI features (optional)
npm run db:push              # create the schema in that database
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

`render.yaml` in the repo root is a [Render Blueprint](https://render.com/docs/infrastructure-as-code):
push to Render, choose "New +" → "Blueprint", and it provisions a free
web service plus a free managed Postgres database from that one file —
no manual configuration. You'll be prompted to paste in `AUTH_SECRET`
(generate one with `openssl rand -base64 32`) and, optionally,
`OPENAI_API_KEY`.

The free web service plan sleeps after 15 minutes with no visitors and
takes a few seconds to wake back up on the next request — a fine
trade-off for two people using this casually. Change `plan: free` to
`plan: starter` on the service in `render.yaml` (~$7/month) if you want
it always-on instead; no other changes needed.

Any other Postgres-compatible host works too (Railway, Fly.io, Supabase,
a VPS with Postgres installed) — just set `DATABASE_URL` to that
database's connection string and run `npm run build && npm run start`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | standard Next.js dev/build/serve |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:push` | sync `prisma/schema.prisma` to the database in `DATABASE_URL` |
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
