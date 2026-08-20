# Kelime Defteri 📔

A digital-notebook English vocabulary learning app: build vocabulary cards
by hand, with AI, or a hybrid of both; study them with a spaced-repetition
scheduler; and practice with AI-generated quizzes — all in a soft,
customizable notebook UI.

## 1. Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One deployable app for UI + API routes; React Server Components keep data fetching simple; trivial to deploy on Vercel, a Node server, or Docker. |
| Database | **SQLite via Prisma ORM** | Zero external services to stand up — the whole app (cards, tags, SRS state, review history, streaks, AI cache) is one file (`prisma/dev.db`). Swapping to Postgres/Supabase later is a one-line `datasource` change since every field type used is portable. |
| Styling | **Tailwind CSS + CSS custom properties** | Six notebook color palettes and four font stacks are implemented as CSS variable sets switched via `data-theme` / `data-font` attributes — no rebuild needed to re-theme, and it composes cleanly with Tailwind utilities. |
| Client state | **Zustand (persisted)** | Theme/font/highlight-style/preferences painted instantly from `localStorage` (no flash of wrong theme) and mirrored to the `Settings` table so they survive across browsers too. |
| AI | **OpenAI SDK, server-only** | All calls happen in Next.js Route Handlers so the API key never reaches the browser. Every call uses **Structured Outputs** (`response_format: json_schema`, `strict: true`) so responses are always valid JSON — no retry/repair tokens spent. |
| Pronunciation | **Free dictionary API (dictionaryapi.dev) + Web Speech API** | Real recorded audio and IPA when available, at zero cost; AI is only used as an IPA fallback for words the dictionary doesn't have. Playback uses the browser's built-in `speechSynthesis` — no TTS API bill at all. |

### Why SQLite instead of Supabase/Firebase

The spec offered Supabase/Firebase/SQLite as options. This app is
single-user by design (a personal vocabulary notebook), so a managed
multi-tenant database adds operational overhead — signup, connection
strings, RLS policies — without buying anything the app needs. SQLite
gives the same "persistent progress tracking" requirement (retention
data, streaks, mastered words, full review history) with zero setup. The
`Settings` table is already modeled as a single row keyed by id, so adding
a `userId` column and switching `provider = "postgresql"` in
`prisma/schema.prisma` is the entire migration path to Supabase if this
ever needs to go multi-user.

### A note on the requested model name

The spec asks for `gpt-5.6-luna` as the default model. That string isn't
in OpenAI's published model list as of this app's build. Rather than
hard-code a guess, the model is read from a single env var
(`OPENAI_MODEL`, defaulting to `gpt-5.6-luna` exactly as requested) with
an automatic one-time fallback to `OPENAI_FALLBACK_MODEL`
(`gpt-4o-mini` by default) if the primary name is rejected — see
`src/lib/openai.ts`. Update `.env` once you've confirmed the correct
model string for your account; no code changes needed.

## 2. Project structure

```
prisma/
  schema.prisma        # Card, ExampleSentence, Tag, ReviewLog, Settings, AICache
  seed.ts               # sample cards for a fresh install

src/
  app/
    page.tsx             # dashboard: streak, due count, daily goal, recent cards
    cards/                # notebook: browse/search/filter, new, [id] view + edit
    review/               # SRS review session (SM-2)
    quiz/                 # AI + algorithmic practice quizzes
    settings/             # theme / font / highlight-style / preferences
    api/
      cards/               # CRUD
      tags/                # tag autocomplete list
      review/              # submit a grade -> SM-2 update + streak
      stats/               # dashboard numbers
      settings/            # get/patch user preferences
      ai/
        generate-card/      # full-card AI draft
        generate-field/     # single-field AI fill (the "modular hybrid" endpoint)
        pronunciation/      # dictionary API lookup + AI IPA fallback
        quiz/                # builds a quiz (half algorithmic, half AI-authored)

  components/
    ui/                   # Button, Field, Panel/Badge — shared primitives
    vocab/                 # VocabForm, TagInput, AIFieldButton, HighlightedSentence, PronunciationPlayer
    review/                 # ReviewSession, RatingButtons
    quiz/                    # QuizRunner, QuizQuestionView (4 question types)
    settings/                 # ThemePicker, FontPicker, HighlightStylePicker, PreferenceSliders
    layout/                    # Navbar, ThemeProvider

  lib/
    prisma.ts       srs.ts        streak.ts      highlight.ts
    openai.ts       ai.ts         dictionary.ts  cache.ts
    quiz.ts         validation.ts settings.ts

  store/settingsStore.ts   # zustand, persisted, theme/font/highlight/preferences
  hooks/useTTS.ts           # Web Speech API playback
  types/index.ts             # shared types incl. enum-like unions (see note below)
```

## 3. Feature-to-code map

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
  table — the same word/field is never billed twice.

## 4. Getting started

```bash
npm install
cp .env.example .env         # fill in OPENAI_API_KEY to enable AI features (optional)
npm run db:push              # create the SQLite schema
npm run db:seed              # a few sample cards to explore the UI with
npm run dev                  # http://localhost:3000
```

The app is fully usable with **no OpenAI key at all** — every AI button
disables itself with an explanatory tooltip, pronunciation still works via
the free dictionary API + Web Speech, and quizzes fall back to fully
algorithmic questions. Set `OPENAI_API_KEY` (and double-check
`OPENAI_MODEL`) whenever you want AI-assisted card filling and contextual
quiz questions.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | standard Next.js dev/build/serve |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:push` | sync `prisma/schema.prisma` to the SQLite file |
| `npm run db:seed` | insert sample vocabulary cards |

## 5. Known limitations / next steps

- Single-user by design (see "Why SQLite" above) — adding accounts means a
  `userId` column plus an auth layer (NextAuth is a natural fit with the
  existing Prisma setup).
- Inflection-aware highlighting (`lib/highlight.ts`) is prefix-based, not a
  real stemmer, so irregular forms ("go" → "went") won't auto-highlight;
  the stored `highlightSpans` can always be hand-corrected per sentence.
- The free dictionary API only covers single English words well;
  multi-word phrases (phrasal verbs, idioms) usually fall through to the
  AI IPA fallback or manual entry.
