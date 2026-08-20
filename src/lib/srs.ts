import type { CardStatus, ReviewRating } from '@/types';

/**
 * Spaced Repetition System — an SM-2 variant with four Anki-style grading
 * buttons (Again / Hard / Good / Easy) instead of SM-2's raw 0-5 quality
 * score. This is the same adaptation most modern flashcard apps use because
 * a 6-point scale is unpleasant to grade against in a UI.
 *
 * Reference: P.A. Wozniak, "SuperMemo 2 Algorithm" (1987).
 */

export interface SrsState {
  easeFactor: number; // starts at 2.5, floor 1.3
  intervalDays: number; // current interval in days (fractional = same-day)
  repetitions: number; // consecutive successful (non-Again) reviews
  status: CardStatus;
}

export interface SrsResult extends SrsState {
  dueAt: Date;
}

const MIN_EASE = 1.3;
const AGAIN_INTERVAL_DAYS = 10 / (24 * 60); // 10 minutes — reappears same session
const HARD_INTERVAL_DAYS = 1; // first "hard" still relearns within a day
const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 6;
const MASTERED_INTERVAL_THRESHOLD = 21; // days — beyond this we call it "mastered"
const MASTERED_REPETITIONS_THRESHOLD = 4;

/** Maps a UI rating to the classic SM-2 0-5 quality score. */
function ratingToQuality(rating: ReviewRating): number {
  switch (rating) {
    case 'AGAIN':
      return 1;
    case 'HARD':
      return 3;
    case 'GOOD':
      return 4;
    case 'EASY':
      return 5;
    default:
      return 3;
  }
}

export function nextSrsState(current: SrsState, rating: ReviewRating, now: Date = new Date()): SrsResult {
  const quality = ratingToQuality(rating);
  let { easeFactor, intervalDays, repetitions } = current;

  // Ease factor update (standard SM-2 formula), applied on every grade
  // except the always-reset "Again".
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const newEase = Math.max(MIN_EASE, easeFactor + easeDelta);

  let newInterval: number;
  let newRepetitions: number;

  if (rating === 'AGAIN') {
    newRepetitions = 0;
    newInterval = AGAIN_INTERVAL_DAYS;
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
  } else {
    newRepetitions = repetitions + 1;
    easeFactor = newEase;

    if (newRepetitions === 1) {
      newInterval = rating === 'HARD' ? HARD_INTERVAL_DAYS : FIRST_INTERVAL_DAYS;
    } else if (newRepetitions === 2) {
      newInterval = SECOND_INTERVAL_DAYS;
    } else {
      newInterval = intervalDays * easeFactor;
    }

    if (rating === 'HARD') newInterval *= 0.85;
    if (rating === 'EASY') newInterval *= 1.3;

    // Never shrink below the previous interval on a pass.
    newInterval = Math.max(newInterval, rating === 'HARD' ? HARD_INTERVAL_DAYS : FIRST_INTERVAL_DAYS);
  }

  let status: CardStatus;
  if (rating === 'AGAIN') {
    status = 'LEARNING';
  } else if (newInterval >= MASTERED_INTERVAL_THRESHOLD && newRepetitions >= MASTERED_REPETITIONS_THRESHOLD) {
    status = 'MASTERED';
  } else if (newRepetitions === 0) {
    status = 'NEW';
  } else if (newRepetitions <= 2) {
    status = 'LEARNING';
  } else {
    status = 'REVIEW';
  }

  const dueAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays: Number(newInterval.toFixed(4)),
    repetitions: newRepetitions,
    status,
    dueAt,
  };
}

export function isDue(dueAt: Date, now: Date = new Date()): boolean {
  return dueAt.getTime() <= now.getTime();
}
