import Link from 'next/link';
import { Badge } from '@/components/ui/Card';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { CARD_STATUS_LABELS, PART_OF_SPEECH_LABELS, primaryMeaning } from '@/types';
import type { CardWithRelations } from '@/types';

export const STATUS_TONE: Record<string, 'accent' | 'success' | 'warn' | 'neutral'> = {
  NEW: 'neutral',
  LEARNING: 'warn',
  REVIEW: 'accent',
  MASTERED: 'success',
};

/** Solid fill for the left-edge status stripe on every card surface (flashcard tile, list row, detail header) — same status colors as STATUS_TONE, just as a background instead of text/badge. */
export const STATUS_STRIPE: Record<string, string> = {
  NEW: 'bg-ink/25',
  LEARNING: 'bg-warn',
  REVIEW: 'bg-accent',
  MASTERED: 'bg-success',
};

export function VocabCardListItem({ card }: { card: CardWithRelations }) {
  const isDue = new Date(card.dueAt).getTime() <= Date.now();
  const meaning = primaryMeaning(card);
  const extraMeanings = card.meanings.length - 1;
  return (
    <Link
      href={`/cards/${card.id}`}
      className="relative flex items-center justify-between gap-3 rounded-xl border border-line bg-card py-3 pl-6 pr-4 shadow-notebook transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className={`absolute inset-y-3 left-0 w-3 rounded-r-full ${STATUS_STRIPE[card.status]}`} aria-hidden="true" />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-base font-semibold text-ink">{card.vocabulary}</span>
          <PronunciationPlayer word={card.vocabulary} ipa={card.ipa} audioUrl={card.audioUrl} size="sm" />
          {meaning?.partOfSpeech && <Badge tone="neutral">{PART_OF_SPEECH_LABELS[meaning.partOfSpeech]}</Badge>}
          {meaning?.cefr && (
            <span className="rounded-full border border-warn/40 bg-warn/15 px-1.5 py-0.5 text-[10px] font-bold text-warn" title="CEFR difficulty level">
              {meaning.cefr}
            </span>
          )}
          {extraMeanings > 0 && (
            <Badge tone="accent" title={`${extraMeanings + 1} meanings recorded for this word`}>
              +{extraMeanings} sense{extraMeanings === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        {meaning?.definitionEn && <p className="mt-1 truncate text-sm text-ink-soft">{meaning.definitionEn}</p>}
        {meaning && meaning.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {meaning.tags.slice(0, 5).map(({ tag }) => (
              <span key={tag.id} className="text-xs text-accent">
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge tone={STATUS_TONE[card.status]}>{CARD_STATUS_LABELS[card.status]}</Badge>
        {isDue && <Badge tone="danger">Due</Badge>}
      </div>
    </Link>
  );
}
