import type { Card, ExampleSentence, Tag } from '@prisma/client';

// SQLite has no native enum type (see prisma/schema.prisma), so the
// conceptually-enum fields are stored as validated strings. These union
// types are the single source of truth for their allowed values across
// both the API layer (validated with zod, see lib/validation.ts) and the
// UI — Prisma's generated Card type has them typed as plain `string`, so
// CardWithRelations narrows them back here.
export type PartOfSpeech =
  | 'NOUN'
  | 'VERB'
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'PREPOSITION'
  | 'CONJUNCTION'
  | 'PRONOUN'
  | 'INTERJECTION';

export type CardStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';
export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
export type HighlightStyle = 'BOLD' | 'UNDERLINE' | 'COLOR' | 'BOLD_UNDERLINE';

export type CardWithRelations = Omit<Card, 'partOfSpeech' | 'status'> & {
  partOfSpeech: PartOfSpeech | null;
  status: CardStatus;
  examples: ExampleSentence[];
  tags: { tag: Tag }[];
};

export interface CardInput {
  vocabulary: string;
  ipa?: string;
  audioUrl?: string;
  definitionEn?: string;
  definitionTr?: string;
  partOfSpeech?: PartOfSpeech | null;
  mnemonic?: string;
  collocations?: string;
  notes?: string;
  tags: string[];
  examples: { text: string; source?: 'USER' | 'AI' }[];
}

export const PARTS_OF_SPEECH: PartOfSpeech[] = [
  'NOUN',
  'VERB',
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
  | 'mnemonic'
  | 'collocations'
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
