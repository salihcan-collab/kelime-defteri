import type { CardWithRelations, QuizQuestion, QuizQuestionMCQ, QuizQuestionRecall } from '@/types';

/**
 * Algorithmic quiz question generation — built entirely from the user's
 * local vocabulary bank with zero AI calls. This covers multiple choice
 * and "recall the mnemonic/definition" question types, which don't need
 * generative text at all, keeping the AI budget reserved for the
 * fill-in-the-blank / sentence-construction types (see ai.ts) that
 * genuinely need it.
 */

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDistractors(pool: CardWithRelations[], correct: CardWithRelations, count: number): CardWithRelations[] {
  const others = pool.filter((c) => c.id !== correct.id && c.definitionEn);
  return shuffle(others).slice(0, count);
}

export function buildDefinitionMCQ(pool: CardWithRelations[], card: CardWithRelations): QuizQuestionMCQ | null {
  if (!card.definitionEn) return null;
  const distractors = pickDistractors(pool, card, 3);
  if (distractors.length < 2) return null;

  const options = shuffle([card.definitionEn, ...distractors.map((d) => d.definitionEn as string)]);
  return {
    type: 'multiple_choice',
    cardId: card.id,
    prompt: `Which definition matches "${card.vocabulary}"?`,
    options,
    correctIndex: options.indexOf(card.definitionEn),
  };
}

export function buildWordForDefinitionMCQ(pool: CardWithRelations[], card: CardWithRelations): QuizQuestionMCQ | null {
  if (!card.definitionEn) return null;
  const distractors = pickDistractors(pool, card, 3);
  if (distractors.length < 2) return null;

  const options = shuffle([card.vocabulary, ...distractors.map((d) => d.vocabulary)]);
  return {
    type: 'multiple_choice',
    cardId: card.id,
    prompt: `Which word means: "${card.definitionEn}"?`,
    options,
    correctIndex: options.indexOf(card.vocabulary),
  };
}

export function buildMnemonicRecall(card: CardWithRelations): QuizQuestionRecall | null {
  if (!card.mnemonic) return null;
  return {
    type: 'recall_mnemonic',
    cardId: card.id,
    word: card.vocabulary,
    prompt: `What's your memory hook for "${card.vocabulary}"? Recall it, then reveal.`,
    answer: card.mnemonic,
  };
}

export function buildDefinitionRecall(card: CardWithRelations): QuizQuestionRecall | null {
  if (!card.definitionEn) return null;
  return {
    type: 'recall_definition',
    cardId: card.id,
    word: card.vocabulary,
    prompt: `Define "${card.vocabulary}" in your own words, then reveal.`,
    answer: card.definitionEn,
  };
}

/** Builds the algorithmic (non-AI) portion of a quiz session for a set of cards. */
export function buildAlgorithmicQuestions(pool: CardWithRelations[], targets: CardWithRelations[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  targets.forEach((card, i) => {
    const variant = i % 4;
    let q: QuizQuestion | null = null;
    if (variant === 0) q = buildDefinitionMCQ(pool, card);
    else if (variant === 1) q = buildWordForDefinitionMCQ(pool, card);
    else if (variant === 2) q = buildMnemonicRecall(card);
    else q = buildDefinitionRecall(card);

    // Graceful fallback if the chosen variant's data is missing.
    q = q ?? buildDefinitionMCQ(pool, card) ?? buildDefinitionRecall(card);
    if (q) questions.push(q);
  });
  return questions;
}
