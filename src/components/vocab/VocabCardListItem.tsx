import Link from 'next/link';
import { Badge } from '@/components/ui/Card';
import { CARD_STATUS_LABELS, PART_OF_SPEECH_LABELS } from '@/types';
import type { CardWithRelations } from '@/types';

const STATUS_TONE: Record<string, 'accent' | 'success' | 'warn' | 'neutral'> = {
  NEW: 'neutral',
  LEARNING: 'warn',
  REVIEW: 'accent',
  MASTERED: 'success',
};

export function VocabCardListItem({ card }: { card: CardWithRelations }) {
  const isDue = new Date(card.dueAt).getTime() <= Date.now();
  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-notebook transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-base font-semibold text-ink">{card.vocabulary}</span>
          {card.ipa && <span className="font-mono text-xs text-ink-soft">{card.ipa}</span>}
          {card.partOfSpeech && <Badge tone="neutral">{PART_OF_SPEECH_LABELS[card.partOfSpeech]}</Badge>}
        </div>
        {card.definitionEn && <p className="mt-1 truncate text-sm text-ink-soft">{card.definitionEn}</p>}
        {card.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.tags.slice(0, 5).map(({ tag }) => (
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
