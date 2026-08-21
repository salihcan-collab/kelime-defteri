import Link from 'next/link';
import { Badge } from '@/components/ui/Card';
import { CARD_STATUS_LABELS, PART_OF_SPEECH_LABELS, primaryMeaning } from '@/types';
import type { CardWithRelations } from '@/types';

export const STATUS_TONE: Record<string, 'accent' | 'success' | 'warn' | 'neutral'> = {
  NEW: 'neutral',
  LEARNING: 'warn',
  REVIEW: 'accent',
  MASTERED: 'success',
};

export function VocabCardListItem({ card }: { card: CardWithRelations }) {
  const isDue = new Date(card.dueAt).getTime() <= Date.now();
  const meaning = primaryMeaning(card);
  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-notebook transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-base font-semibold text-ink">{card.vocabulary}</span>
          {card.ipa && <span className="font-mono text-xs text-ink-soft">{card.ipa}</span>}
          {meaning?.partOfSpeech && <Badge tone="neutral">{PART_OF_SPEECH_LABELS[meaning.partOfSpeech]}</Badge>}
          {meaning?.cefr && (
            <span className="rounded-full border border-warn/40 bg-warn/15 px-1.5 py-0.5 text-[10px] font-bold text-warn" title="CEFR difficulty level">
              {meaning.cefr}
            </span>
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
