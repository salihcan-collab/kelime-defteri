import { z } from 'zod';

export const partOfSpeechEnum = z.enum([
  'NOUN',
  'VERB',
  'PHRASAL_VERB',
  'ADJECTIVE',
  'ADVERB',
  'PREPOSITION',
  'CONJUNCTION',
  'PRONOUN',
  'INTERJECTION',
]);

export const cefrEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

export const exampleSentenceInput = z.object({
  text: z.string().min(1).max(500),
  source: z.enum(['USER', 'AI']).default('USER'),
});

export const meaningInputSchema = z.object({
  partOfSpeech: partOfSpeechEnum.optional().nullable(),
  // Per-part-of-speech pronunciation override (stress often shifts with
  // word class) and a short Cambridge-style tag distinguishing senses
  // within the same part of speech — both optional, see schema.prisma.
  ipa: z.string().max(200).optional().nullable(),
  label: z.string().max(60).optional().nullable(),
  cefr: cefrEnum.optional().nullable(),
  definitionEn: z.string().max(2000).optional().nullable(),
  definitionTr: z.string().max(2000).optional().nullable(),
  // Per-sense, not per-card — see the note in schema.prisma.
  synonyms: z.string().max(500).optional().nullable(),
  antonyms: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  examples: z.array(exampleSentenceInput).default([]),
});

export const cardInputSchema = z.object({
  vocabulary: z.string().trim().min(1, 'Vocabulary is required').max(120),
  ipa: z.string().max(200).optional().nullable(),
  audioUrl: z.string().max(1000).optional().nullable(),
  mnemonic: z.string().max(2000).optional().nullable(),
  collocations: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  // At least one sense — even a blank one, so a freshly-created card
  // always has somewhere for its first definition to live.
  meanings: z.array(meaningInputSchema).min(1),
});

export type CardInputParsed = z.infer<typeof cardInputSchema>;

export const reviewSubmitSchema = z.object({
  cardId: z.string().min(1),
  rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']),
});

export const settingsUpdateSchema = z.object({
  theme: z.string().min(1).max(40).optional(),
  fontStyle: z.string().min(1).max(40).optional(),
  highlightStyle: z.enum(['BOLD', 'UNDERLINE', 'COLOR', 'BOLD_UNDERLINE']).optional(),
  ttsRate: z.number().min(0.5).max(1.5).optional(),
  dailyGoal: z.number().int().min(1).max(200).optional(),
});

export const aiFieldRequestSchema = z.object({
  field: z.enum(['ipa', 'definitionEn', 'definitionTr', 'partOfSpeech', 'label', 'cefr', 'mnemonic', 'collocations', 'synonyms', 'antonyms', 'examples']),
  word: z.string().trim().min(1),
  context: z
    .object({
      definitionEn: z.string().optional(),
      partOfSpeech: z.string().optional(),
    })
    .optional(),
});

export const quizRequestSchema = z.object({
  cardIds: z.array(z.string()).min(1).max(30),
  includeAiQuestions: z.boolean().default(true),
});

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(200);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(200);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});
