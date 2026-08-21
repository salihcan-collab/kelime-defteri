import Link from 'next/link';
import { Badge } from '@/components/ui/Card';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { CARD_STATUS_LABELS, PART_OF_SPEECH_LABELS, primaryMeaning } from '@/types';
import { STATUS_TONE, STATUS_STRIPE } from '@/components/vocab/VocabCardListItem';
import type { CardWithRelations } from '@/types';

/**
 * Compact flashcard-style tile for the notebook grid — a handful fit per
 * row instead of one full-width row per word (see VocabCardListItem for
 * the narrower list layout used in the dashboard's "up next" style
 * previews). Shows the card's primary sense; a small "+N senses" badge
 * hints when there's more to see. The whole tile links to the card's
 * full detail page.
 */
export function VocabFlashCard({ card }: { card: CardWithRelations }) {
  const isDue = new Date(card.dueAt).getTime() <= Date.now();
  const meaning = primaryMeaning(card);
  const extraMeanings = card.meanings.length - 1;
  // Tags live on each sense now — the tile previews the primary sense's,
  // same as its part of speech/definition/CEFR above.
  const tags = meaning?.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const extraTagCount = tags.length - visibleTags.length;

  return (
    <Link
      href={`/cards/${card.id}`}
      className="relative flex h-full flex-col gap-2 rounded-xl border border-line bg-card p-4 pl-6 shadow-notebook transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className={`absolute inset-y-2.5 left-2 w-1.5 rounded-full ${STATUS_STRIPE[card.status]}`} aria-hidden="true" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-heading text-base font-semibold text-ink">{card.vocabulary}</div>
          <PronunciationPlayer word={card.vocabulary} ipa={card.ipa} audioUrl={card.audioUrl} size="sm" />
        </div>
        <Badge tone={STATUS_TONE[card.status]} className="shrink-0">
          {CARD_STATUS_LABELS[card.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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

      {meaning?.definitionEn && <p className="line-clamp-3 text-sm text-ink-soft">{meaning.definitionEn}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {visibleTags.map(({ tag }) => (
          <span key={tag.id} className="text-xs text-accent">
            #{tag.name}
          </span>
        ))}
        {extraTagCount > 0 && <span className="text-xs text-ink-soft">+{extraTagCount}</span>}
        {isDue && (
          <Badge tone="danger" className="ml-auto">
            Due
          </Badge>
        )}
      </div>
    </Link>
  );
}
