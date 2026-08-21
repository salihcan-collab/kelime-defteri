'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Panel, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { CambridgeLookupLink } from '@/components/vocab/CambridgeLookupLink';
import { HighlightedSentence } from '@/components/vocab/HighlightedSentence';
import { groupMeaningsByPos } from '@/lib/meaningGroups';
import { STATUS_TONE, STATUS_STRIPE } from '@/components/vocab/VocabCardListItem';
import { CARD_STATUS_LABELS, PART_OF_SPEECH_LABELS } from '@/types';
import type { CardWithRelations, MeaningWithExamples } from '@/types';

const SENSE_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export function VocabCardView({ card }: { card: CardWithRelations }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const meaningGroups = groupMeaningsByPos(card.meanings);

  async function handleDelete() {
    if (!confirm(`Delete "${card.vocabulary}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/cards');
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel className="relative pl-7">
        <span className={`absolute inset-y-4 left-0 w-1.5 rounded-full ${STATUS_STRIPE[card.status]}`} aria-hidden="true" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-semibold text-ink">{card.vocabulary}</h1>
              <Badge tone={STATUS_TONE[card.status]}>{CARD_STATUS_LABELS[card.status]}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CambridgeLookupLink word={card.vocabulary} />
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/cards/${card.id}/edit`}>
              <Button variant="outline" size="sm">
                ✏️ Edit
              </Button>
            </Link>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
              🗑️ Delete
            </Button>
          </div>
        </div>
      </Panel>

      {meaningGroups.map((group, gi) => {
        const groupIpa = group.items.find((it) => it.meaning.ipa)?.meaning.ipa || card.ipa;
        return (
          <Panel key={group.partOfSpeech ?? `sense-${gi}`}>
            {/* Each part-of-speech block is a self-contained dictionary
                entry — repeats the headword (Cambridge/Merriam-Webster both
                do this rather than relying on a single page-level title),
                its part of speech, "N of M" when the word has more than
                one, and a compact pronunciation for this specific entry
                (stress often shifts by word class). */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-heading text-xl font-bold text-ink">{card.vocabulary}</span>
                <Badge tone="accent">{group.partOfSpeech ? PART_OF_SPEECH_LABELS[group.partOfSpeech] : 'Meaning'}</Badge>
                {meaningGroups.length > 1 && (
                  <span className="text-xs font-medium text-ink-soft">
                    {gi + 1} of {meaningGroups.length}
                  </span>
                )}
              </div>
              {groupIpa && <PronunciationPlayer word={card.vocabulary} ipa={groupIpa} audioUrl={card.audioUrl} size="sm" />}
            </div>

            <div className="space-y-4">
              {group.items.map(({ meaning }, si) => (
                <MeaningDetail key={meaning.id} meaning={meaning} showLetter={group.items.length > 1} letterIndex={si} bordered={si > 0} />
              ))}
            </div>
          </Panel>
        );
      })}

      {card.collocations && (
        <Panel>
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Collocations &amp; Context</h2>
          <p className="whitespace-pre-wrap text-ink">{card.collocations}</p>
        </Panel>
      )}

      {card.mnemonic && (
        <Panel className="border-accent/40 bg-accent-soft/40">
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-accent">💡 Memory Hook</h2>
          <p className="whitespace-pre-wrap text-ink">{card.mnemonic}</p>
        </Panel>
      )}

      {card.notes && (
        <Panel>
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Notes</h2>
          <p className="whitespace-pre-wrap text-ink">{card.notes}</p>
        </Panel>
      )}

      <Panel className="text-sm text-ink-soft">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>Repetitions: {card.repetitions}</span>
          <span>Ease factor: {card.easeFactor.toFixed(2)}</span>
          <span>Interval: {card.intervalDays < 1 ? `${Math.round(card.intervalDays * 24 * 60)} min` : `${Math.round(card.intervalDays)} d`}</span>
          <span>Next review: {new Date(card.dueAt).toLocaleDateString()}</span>
        </div>
      </Panel>
    </div>
  );
}

/**
 * One sense within a part-of-speech block. When a block holds more than
 * one sense (e.g. the noun senses of "object": THING vs. PURPOSE), each
 * gets a small a/b/c marker — mirroring Merriam-Webster's 1a/1b numbering
 * — plus its optional Cambridge-style label and CEFR badge. A block with
 * only one sense skips all of that.
 *
 * No "Definition" / "Turkish Translation" / "Example Sentences" text
 * headings here on purpose — the field labels are only useful while
 * filling the form in (see VocabForm). On the read view each field is
 * told apart by its own typography instead: the English definition reads
 * as plain body text, the Turkish translation sits just under it in
 * italics behind a flag, and examples are quoted, shaded lines with the
 * target word highlighted — three distinct looks, no repeated labels.
 */
function MeaningDetail({
  meaning,
  showLetter,
  letterIndex,
  bordered,
}: {
  meaning: MeaningWithExamples;
  showLetter: boolean;
  letterIndex: number;
  bordered: boolean;
}) {
  return (
    <div className={bordered ? 'border-t border-line/60 pt-4' : undefined}>
      {(showLetter || meaning.label || meaning.cefr) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {showLetter && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[11px] font-semibold text-ink-soft">
              {SENSE_LETTERS[letterIndex] ?? letterIndex + 1}
            </span>
          )}
          {meaning.label && (
            <span className="rounded-full bg-paper-alt px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{meaning.label}</span>
          )}
          {meaning.cefr && (
            <span
              className="rounded-full border border-warn/40 bg-warn/15 px-2 py-0.5 text-[10px] font-bold text-warn"
              title="CEFR difficulty level"
            >
              {meaning.cefr}
            </span>
          )}
        </div>
      )}

      <p className="whitespace-pre-wrap text-ink">{meaning.definitionEn || '—'}</p>
      {meaning.definitionTr && (
        <p className="mt-1 whitespace-pre-wrap text-sm italic text-ink-soft">
          <span className="mr-1 not-italic">🇹🇷</span>
          {meaning.definitionTr}
        </p>
      )}

      {meaning.examples.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {meaning.examples.map((ex) => (
            <li key={ex.id} className="rounded-lg bg-paper px-3 py-2 text-sm text-ink">
              &ldquo;
              <HighlightedSentence text={ex.text} highlightSpans={ex.highlightSpans} />
              &rdquo;
              {ex.source === 'AI' && <span className="ml-2 text-xs text-ink-soft">✨</span>}
            </li>
          ))}
        </ul>
      )}

      {(meaning.synonyms || meaning.antonyms) && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink">
          {meaning.synonyms && (
            <p>
              <span className="text-ink-soft">Syn:</span> {meaning.synonyms}
            </p>
          )}
          {meaning.antonyms && (
            <p>
              <span className="text-ink-soft">Ant:</span> {meaning.antonyms}
            </p>
          )}
        </div>
      )}

      {meaning.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {meaning.tags.map(({ tag }) => (
            <Link key={tag.id} href={`/cards?tag=${encodeURIComponent(tag.name)}`} className="text-xs text-accent hover:underline">
              #{tag.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
