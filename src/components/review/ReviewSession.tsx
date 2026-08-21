'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Panel, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { HighlightedSentence } from '@/components/vocab/HighlightedSentence';
import { RatingButtons } from '@/components/review/RatingButtons';
import { PART_OF_SPEECH_LABELS, primaryMeaning } from '@/types';
import type { CardWithRelations, ReviewRating } from '@/types';

/** Lightbulb icon for the memory-hint toggle — same hand-drawn-icon
 * treatment as PronunciationPlayer's speaker, so this recall aid reads
 * as a designed button rather than a plain text link. */
function HintIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3a6 6 0 0 0-3.6 10.8c.6.45.9 1.05.9 1.7V16h5.4v-.5c0-.65.3-1.25.9-1.7A6 6 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.5 18.5h5M10.3 21h3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ReviewSession() {
  const [queue, setQueue] = useState<CardWithRelations[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    fetch('/api/cards?due=true')
      .then((res) => res.json())
      .then((data) => setQueue(data.cards ?? []));
  }, []);

  async function handleRate(rating: ReviewRating) {
    if (!queue || queue.length === 0) return;
    const [card, ...rest] = queue;
    setSubmitting(true);
    try {
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, rating }),
      });
      setReviewedCount((c) => c + 1);
      // "Again" cards go to the back of today's queue so they resurface this session.
      setQueue(rating === 'AGAIN' ? [...rest, card] : rest);
      setRevealed(false);
      setHintOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (queue === null) {
    return <Panel className="text-center text-ink-soft">Loading your review queue…</Panel>;
  }

  if (queue.length === 0) {
    return (
      <Panel className="text-center">
        <div className="text-4xl">🎉</div>
        <h1 className="mt-2 font-heading text-xl font-semibold text-ink">
          {reviewedCount > 0 ? 'Session complete!' : 'Nothing due right now'}
        </h1>
        <p className="mt-1 text-ink-soft">
          {reviewedCount > 0 ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}.` : 'Come back later, or practice with a quiz instead.'}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
          <Link href="/quiz">
            <Button>✍️ Practice quiz</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  const card = queue[0];
  const meaning = primaryMeaning(card);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>{queue.length} card{queue.length === 1 ? '' : 's'} remaining</span>
        <span>{reviewedCount} reviewed this session</span>
      </div>

      <Panel className="min-h-[22rem]">
        <div className="flex items-center justify-between">
          <Badge tone="neutral">{meaning?.partOfSpeech ? PART_OF_SPEECH_LABELS[meaning.partOfSpeech] : 'Word'}</Badge>
        </div>

        <div className="mt-6 text-center">
          <h1 className="font-heading text-3xl font-semibold text-ink">{card.vocabulary}</h1>
          <div className="mt-2 flex justify-center">
            <PronunciationPlayer word={card.vocabulary} ipa={card.ipa} audioUrl={card.audioUrl} />
          </div>
        </div>

        {/* The memory hook is a recall aid, so it's offered while the user is
            still struggling — not tucked behind "Show answer" — but stays
            hidden until asked for so it doesn't spoil the recall attempt.
            Its own row, separate from the pronunciation button above, so
            it doesn't read as another way to hear the word. The button
            (icon + label) stays visible whether the hint is open or
            closed, so it also doubles as the way to hide it again. Once
            the answer is revealed the hint is redundant — the full
            meaning already answers more than the hint would — so it
            disappears along with the "before" state. */}
        {!revealed && card.mnemonic && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setHintOpen((v) => !v)}
              aria-pressed={hintOpen}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 ${
                hintOpen ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent'
              }`}
            >
              <HintIcon className="h-3.5 w-3.5" />
              Need a hint?
            </button>
            {hintOpen && (
              <div className="mx-auto mt-3 flex max-w-sm items-start gap-2 rounded-lg bg-accent-soft/50 p-2.5 text-left">
                <HintIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-ink">{card.mnemonic}</p>
              </div>
            )}
          </div>
        )}

        {!revealed ? (
          <div className="mt-8 text-center">
            <p className="mb-3 text-sm text-ink-soft">Try to recall the meaning, then reveal.</p>
            <Button onClick={() => setRevealed(true)}>Show answer</Button>
          </div>
        ) : (
          // Same typography-only field distinction as the card detail page —
          // no "Definition" / "Turkish" / "Example" labels, each field just
          // has its own look (see VocabCardView's MeaningDetail).
          <div className="mt-6 space-y-3 text-left">
            {meaning?.definitionEn && <p className="text-ink">{meaning.definitionEn}</p>}
            {meaning?.definitionTr && (
              <p className="text-sm italic text-ink-soft">
                <span className="mr-1 not-italic">🇹🇷</span>
                {meaning.definitionTr}
              </p>
            )}
            {meaning?.examples[0] && (
              <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink">
                &ldquo;
                <HighlightedSentence text={meaning.examples[0].text} highlightSpans={meaning.examples[0].highlightSpans} />
                &rdquo;
              </p>
            )}
            {card.meanings.length > 1 && (
              <p className="text-xs text-ink-soft">+{card.meanings.length - 1} more sense{card.meanings.length - 1 === 1 ? '' : 's'} — see full card after review.</p>
            )}
          </div>
        )}
      </Panel>

      {revealed && (
        <div>
          <p className="mb-2 text-center text-sm text-ink-soft">How well did you recall it?</p>
          <RatingButtons onRate={handleRate} disabled={submitting} />
        </div>
      )}
    </div>
  );
}
