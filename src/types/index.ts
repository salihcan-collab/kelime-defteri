import type { Card, ExampleSentence, Meaning, Tag } from '@prisma/client';

// Postgres enum-like fields are stored as validated strings (see the note
// in prisma/schema.prisma) — these union types are the single source of
// truth for their allowed values across both the API layer (validated
// with zod, see lib/validation.ts) and the UI.
export type PartOfSpeech =
  | 'NOUN'
  | 'VERB'
  | 'PHRASAL_VERB'
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'PREPOSITION'
  | 'CONJUNCTION'
  | 'PRONOUN'
  | 'INTERJECTION';

export type CardStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';
export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
export type HighlightStyle = 'BOLD' | 'UNDERLINE' | 'COLOR' | 'BOLD_UNDERLINE';
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type MeaningWithExamples = Omit<Meaning, 'partOfSpeech' | 'cefr'> & {
  partOfSpeech: PartOfSpeech | null;
  cefr: CefrLevel | null;
  examples: ExampleSentence[];
};

export type CardWithRelations = Omit<Card, 'status'> & {
  status: CardStatus;
  meanings: MeaningWithExamples[];
  tags: { tag: Tag }[];
};

/** The word's primary (first) sense — what previews, quizzes, and review show. */
export function primaryMeaning(card: Pick<CardWithRelations, 'meanings'>): MeaningWithExamples | undefined {
  return card.meanings[0];
}

export interface MeaningInput {
  partOfSpeech?: PartOfSpeech | null;
  ipa?: string | null;
  label?: string | null;
  cefr?: CefrLevel | null;
  definitionEn?: string;
  definitionTr?: string;
  synonyms?: string | null;
  antonyms?: string | null;
  examples: { text: string; source?: 'USER' | 'AI' }[];
}

export interface CardInput {
  vocabulary: string;
  ipa?: string;
  audioUrl?: string;
  mnemonic?: string;
  collocations?: string;
  notes?: string;
  tags: string[];
  meanings: MeaningInput[];
}

export const PARTS_OF_SPEECH: PartOfSpeech[] = [
  'NOUN',
  'VERB',
  'PHRASAL_VERB',
  'ADJECTIVE',
  'ADVERB',
  'PREPOSITION',
  'CONJUNCTION',
  'PRONOUN',
  'INTERJECTION',
];

export const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, string> = {
  NOUN: 'Noun',
  VERB: 'Verb',
  PHRASAL_VERB: 'Phrasal Verb',
  ADJECTIVE: 'Adjective',
  ADVERB: 'Adverb',
  PREPOSITION: 'Preposition',
  CONJUNCTION: 'Conjunction',
  PRONOUN: 'Pronoun',
  INTERJECTION: 'Interjection',
};

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  NEW: 'New',
  LEARNING: 'Learning',
  REVIEW: 'Review',
  MASTERED: 'Mastered',
};

export const HIGHLIGHT_STYLE_LABELS: Record<HighlightStyle, string> = {
  BOLD: 'Bold',
  UNDERLINE: 'Underline',
  COLOR: 'Color highlight',
  BOLD_UNDERLINE: 'Bold & Underline',
};

export type AiFillableField =
  | 'ipa'
  | 'definitionEn'
  | 'definitionTr'
  | 'partOfSpeech'
  | 'label'
  | 'cefr'
  | 'mnemonic'
  | 'collocations'
  | 'synonyms'
  | 'antonyms'
  | 'examples'
  | 'all';

export interface QuizQuestionMCQ {
  type: 'multiple_choice';
  cardId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface QuizQuestionFillBlank {
  type: 'fill_blank';
  cardId: string;
  sentence: string; // contains "____" where the word goes
  answer: string;
  hint?: string;
}

export interface QuizQuestionSentenceConstruction {
  type: 'sentence_construction';
  cardId: string;
  word: string;
  prompt: string;
  sampleAnswer: string;
}

export interface QuizQuestionRecall {
  type: 'recall_mnemonic' | 'recall_definition';
  cardId: string;
  word: string;
  prompt: string;
  answer: string;
}

export type QuizQuestion =
  | QuizQuestionMCQ
  | QuizQuestionFillBlank
  | QuizQuestionSentenceConstruction
  | QuizQuestionRecall;
