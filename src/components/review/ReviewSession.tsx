'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Panel, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { HighlightedSentence } from '@/components/vocab/HighlightedSentence';
import { RatingButtons } from '@/components/review/RatingButtons';
import { PART_OF_SPEECH_LABELS } from '@/types';
import type { CardWithRelations, ReviewRating } from '@/types';

export function ReviewSession() {
  const [queue, setQueue] = useState<CardWithRelations[] | null>(null);
  const [revealed, setRevealed] = useState(false);
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

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>{queue.length} card{queue.length === 1 ? '' : 's'} remaining</span>
        <span>{reviewedCount} reviewed this session</span>
      </div>

      <Panel className="min-h-[22rem]">
        <div className="flex items-center justify-between">
          <Badge tone="neutral">{card.partOfSpeech ? PART_OF_SPEECH_LABELS[card.partOfSpeech] : 'Word'}</Badge>
        </div>

        <div className="mt-6 text-center">
          <h1 className="font-heading text-3xl font-semibold text-ink">{card.vocabulary}</h1>
          <div className="mt-2 flex justify-center">
            <PronunciationPlayer word={card.vocabulary} ipa={card.ipa} audioUrl={card.audioUrl} />
          </div>
        </div>

        {!revealed ? (
          <div className="mt-8 text-center">
            <p className="mb-3 text-sm text-ink-soft">Try to recall the meaning, then reveal.</p>
            <Button onClick={() => setRevealed(true)}>Show answer</Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3 text-left">
            {card.definitionEn && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Definition</div>
                <p className="text-ink">{card.definitionEn}</p>
              </div>
            )}
            {card.definitionTr && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Turkish</div>
                <p className="text-ink">{card.definitionTr}</p>
              </div>
            )}
            {card.mnemonic && (
              <div className="rounded-lg bg-accent-soft/50 p-2.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-accent">💡 Memory hook</div>
                <p className="text-ink">{card.mnemonic}</p>
              </div>
            )}
            {card.examples[0] && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Example</div>
                <p className="text-ink">
                  <HighlightedSentence text={card.examples[0].text} highlightSpans={card.examples[0].highlightSpans} />
                </p>
              </div>
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
