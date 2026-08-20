import { callStructured } from './openai';
import { getCached, setCached } from './cache';
import { lookupDictionary } from './dictionary';
import type { AiFillableField, PartOfSpeech, QuizQuestion } from '@/types';

/**
 * All AI-assisted content generation for the app. Every function here:
 *  1. Checks the persistent AICache first (see cache.ts) — a given word +
 *     field combination is only ever billed once.
 *  2. Uses OpenAI Structured Outputs (see openai.ts) so the model cannot
 *     return malformed JSON and we never burn tokens on retries/repairs.
 *  3. Is field-scoped: the modular "fill just this field" UX calls the
 *     narrow `generateCardField`, while full AI drafting calls
 *     `generateFullCard` once (cheaper than 6 separate calls).
 */

const PARTS_OF_SPEECH_ENUM: PartOfSpeech[] = [
  'NOUN',
  'VERB',
  'ADJECTIVE',
  'ADVERB',
  'PREPOSITION',
  'CONJUNCTION',
  'PRONOUN',
  'INTERJECTION',
];

export interface FullCardDraft {
  ipa: string;
  definitionEn: string;
  definitionTr: string;
  partOfSpeech: PartOfSpeech;
  mnemonic: string;
  collocations: string;
  exampleSentences: string[];
  suggestedTags: string[];
}

const FULL_CARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ipa: { type: 'string', description: 'IPA phonetic transcription, e.g. /rɪˈzɪliənt/' },
    definitionEn: { type: 'string', description: 'Clear English definition, one or two sentences.' },
    definitionTr: { type: 'string', description: 'Accurate Turkish translation/definition of the word.' },
    partOfSpeech: { type: 'string', enum: PARTS_OF_SPEECH_ENUM },
    mnemonic: { type: 'string', description: 'A short, vivid memory hook / mnemonic association to remember the word.' },
    collocations: { type: 'string', description: 'Comma-separated common collocations / phrases using the word.' },
    exampleSentences: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 3,
      description: 'Natural example sentences that each use the target word exactly once.',
    },
    suggestedTags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 4,
      description: 'Short lowercase topic tags, e.g. "business", "emotions", "toefl".',
    },
  },
  required: ['ipa', 'definitionEn', 'definitionTr', 'partOfSpeech', 'mnemonic', 'collocations', 'exampleSentences', 'suggestedTags'],
} as const;

export async function generateFullCard(word: string): Promise<FullCardDraft> {
  const cached = await getCached<FullCardDraft>('full_card', word);
  if (cached) return cached;

  const result = await callStructured<FullCardDraft>({
    schemaName: 'vocabulary_card',
    system:
      'You are an expert English lexicographer and language-learning coach helping a Turkish-speaking learner build a vocabulary flashcard. Be concise, accurate, and pedagogically useful. Mnemonics should be vivid and memorable, not generic.',
    user: `Create a complete vocabulary flashcard for the English word/phrase: "${word}".`,
    schema: FULL_CARD_SCHEMA,
  });

  await setCached('full_card', word, result);
  return result;
}

const FIELD_SCHEMAS: Partial<Record<AiFillableField, Record<string, unknown>>> = {
  ipa: {
    type: 'object',
    additionalProperties: false,
    properties: { ipa: { type: 'string' } },
    required: ['ipa'],
  },
  definitionEn: {
    type: 'object',
    additionalProperties: false,
    properties: { definitionEn: { type: 'string' } },
    required: ['definitionEn'],
  },
  definitionTr: {
    type: 'object',
    additionalProperties: false,
    properties: { definitionTr: { type: 'string' } },
    required: ['definitionTr'],
  },
  partOfSpeech: {
    type: 'object',
    additionalProperties: false,
    properties: { partOfSpeech: { type: 'string', enum: PARTS_OF_SPEECH_ENUM } },
    required: ['partOfSpeech'],
  },
  mnemonic: {
    type: 'object',
    additionalProperties: false,
    properties: { mnemonic: { type: 'string' } },
    required: ['mnemonic'],
  },
  collocations: {
    type: 'object',
    additionalProperties: false,
    properties: { collocations: { type: 'string' } },
    required: ['collocations'],
  },
  examples: {
    type: 'object',
    additionalProperties: false,
    properties: {
      exampleSentences: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
    },
    required: ['exampleSentences'],
  },
};

const FIELD_PROMPTS: Partial<Record<AiFillableField, string>> = {
  ipa: 'Give the IPA phonetic transcription only.',
  definitionEn: 'Give a clear, concise English definition (1-2 sentences) only.',
  definitionTr: 'Give an accurate Turkish translation/definition only.',
  partOfSpeech: 'Classify the primary part of speech only.',
  mnemonic: 'Give one vivid, memorable mnemonic / memory hook only, tailored so it is easy to visualize.',
  collocations: 'Give common collocations and set phrases using the word, comma-separated, only.',
  examples: 'Give 2-3 natural example sentences that each use the word exactly once.',
};

/** Generates a single field without touching the rest of the card — the "modular hybrid" AI fill. */
export async function generateCardField(
  field: Exclude<AiFillableField, 'all'>,
  word: string,
  context?: { definitionEn?: string; partOfSpeech?: string },
): Promise<Record<string, unknown>> {
  const schema = FIELD_SCHEMAS[field];
  const promptHint = FIELD_PROMPTS[field];
  if (!schema || !promptHint) throw new Error(`Unsupported AI field: ${field}`);

  const cacheInput = { word, field, context };
  const cached = await getCached<Record<string, unknown>>('card_field', cacheInput);
  if (cached) return cached;

  const contextLines = context
    ? Object.entries(context)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : '';

  const result = await callStructured<Record<string, unknown>>({
    schemaName: `card_field_${field}`,
    system:
      'You are an expert English lexicographer helping a Turkish-speaking learner fill in one specific field of a vocabulary flashcard. Only produce the requested field — be concise and accurate.',
    user: `Word: "${word}"\n${contextLines}\n\nTask: ${promptHint}`,
    schema,
  });

  await setCached('card_field', cacheInput, result);
  return result;
}

/** IPA generation fallback used only when the free dictionary API has no entry for the word. */
export async function generateIpaFallback(word: string): Promise<string | null> {
  try {
    const { ipa } = await generateCardField('ipa', word);
    return typeof ipa === 'string' ? ipa : null;
  } catch {
    return null;
  }
}

/** Combined pronunciation resolver: real dictionary data first, AI IPA as a fallback. */
export async function resolvePronunciation(word: string): Promise<{ ipa: string | null; audioUrl: string | null; source: 'dictionary' | 'ai' | 'none' }> {
  const dict = await lookupDictionary(word);
  if (dict.ipa || dict.audioUrl) {
    return { ipa: dict.ipa, audioUrl: dict.audioUrl, source: 'dictionary' };
  }
  const aiIpa = await generateIpaFallback(word);
  return { ipa: aiIpa, audioUrl: null, source: aiIpa ? 'ai' : 'none' };
}

// ---------------------------------------------------------------------------
// Quiz generation
// ---------------------------------------------------------------------------

interface QuizSourceCard {
  id: string;
  vocabulary: string;
  definitionEn: string | null;
  definitionTr: string | null;
  mnemonic: string | null;
}

const QUIZ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          cardId: { type: 'string' },
          type: { type: 'string', enum: ['fill_blank', 'sentence_construction'] },
          sentence: { type: 'string', description: 'For fill_blank: a sentence with the target word replaced by "____".' },
          prompt: { type: 'string', description: 'For sentence_construction: an instruction asking the learner to use the word correctly.' },
          answer: { type: 'string', description: 'For fill_blank: the exact missing word.' },
          sampleAnswer: { type: 'string', description: 'For sentence_construction: one acceptable example sentence.' },
        },
        required: ['cardId', 'type', 'sentence', 'prompt', 'answer', 'sampleAnswer'],
      },
    },
  },
  required: ['questions'],
} as const;

interface QuizGenResponse {
  questions: {
    cardId: string;
    type: 'fill_blank' | 'sentence_construction';
    sentence: string;
    prompt: string;
    answer: string;
    sampleAnswer: string;
  }[];
}

/**
 * Generates AI-authored contextual questions (fill-in-the-blank + sentence
 * construction) for a batch of cards. Multiple-choice and recall questions
 * are generated algorithmically from the local vocabulary bank instead
 * (see quiz.ts) since they don't need a model call at all — that's the
 * bulk of the cost optimization for this feature.
 */
export async function generateContextualQuiz(cards: QuizSourceCard[]): Promise<QuizQuestion[]> {
  if (cards.length === 0) return [];

  const cacheInput = { ids: cards.map((c) => c.id).sort() };
  const cached = await getCached<QuizQuestion[]>('quiz_contextual', cacheInput);
  if (cached) return cached;

  const wordList = cards
    .map((c) => `- id: ${c.id} | word: "${c.vocabulary}" | definition: ${c.definitionEn ?? 'n/a'}`)
    .join('\n');

  const response = await callStructured<QuizGenResponse>({
    schemaName: 'quiz_questions',
    system:
      'You are a language-learning quiz author. For each given word, produce exactly one question: either a fill-in-the-blank sentence (natural context, the blank marked as "____", answer = the exact word form used) or a sentence-construction prompt asking the learner to write their own sentence with the word. Vary the type across the list. Keep sentences natural and at an upper-intermediate level.',
    user: `Create one question per word for this list:\n${wordList}`,
    schema: QUIZ_SCHEMA,
    temperature: 0.8,
  });

  const questions: QuizQuestion[] = response.questions.map((q) => {
    if (q.type === 'fill_blank') {
      return { type: 'fill_blank', cardId: q.cardId, sentence: q.sentence, answer: q.answer } satisfies QuizQuestion;
    }
    return {
      type: 'sentence_construction',
      cardId: q.cardId,
      word: cards.find((c) => c.id === q.cardId)?.vocabulary ?? '',
      prompt: q.prompt,
      sampleAnswer: q.sampleAnswer,
    } satisfies QuizQuestion;
  });

  await setCached('quiz_contextual', cacheInput, questions);
  return questions;
}
