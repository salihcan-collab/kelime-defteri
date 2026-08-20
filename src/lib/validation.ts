import { z } from 'zod';

export const partOfSpeechEnum = z.enum([
  'NOUN',
  'VERB',
  'ADJECTIVE',
  'ADVERB',
  'PREPOSITION',
  'CONJUNCTION',
  'PRONOUN',
  'INTERJECTION',
]);

export const exampleSentenceInput = z.object({
  text: z.string().min(1).max(500),
  source: z.enum(['USER', 'AI']).default('USER'),
});

export const cardInputSchema = z.object({
  vocabulary: z.string().trim().min(1, 'Vocabulary is required').max(120),
  ipa: z.string().max(200).optional().nullable(),
  audioUrl: z.string().max(1000).optional().nullable(),
  definitionEn: z.string().max(2000).optional().nullable(),
  definitionTr: z.string().max(2000).optional().nullable(),
  partOfSpeech: partOfSpeechEnum.optional().nullable(),
  mnemonic: z.string().max(2000).optional().nullable(),
  collocations: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  examples: z.array(exampleSentenceInput).default([]),
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
  field: z.enum(['ipa', 'definitionEn', 'definitionTr', 'partOfSpeech', 'mnemonic', 'collocations', 'examples']),
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
