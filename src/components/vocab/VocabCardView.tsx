'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Panel, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { HighlightedSentence } from '@/components/vocab/HighlightedSentence';
import { CARD_STATUS_LABELS, PART_OF_SPEECH_LABELS } from '@/types';
import type { CardWithRelations } from '@/types';

export function VocabCardView({ card }: { card: CardWithRelations }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

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
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-semibold text-ink">{card.vocabulary}</h1>
              <Badge tone="accent">{CARD_STATUS_LABELS[card.status]}</Badge>
            </div>
            <div className="mt-2">
              <PronunciationPlayer word={card.vocabulary} ipa={card.ipa} audioUrl={card.audioUrl} />
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

        {card.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.tags.map(({ tag }) => (
              <Link key={tag.id} href={`/cards?tag=${encodeURIComponent(tag.name)}`} className="text-sm text-accent hover:underline">
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {card.meanings.map((meaning, i) => (
        <Panel key={meaning.id}>
          <div className="mb-3 flex items-center gap-2">
            {card.meanings.length > 1 && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                {i + 1}
              </span>
            )}
            {meaning.partOfSpeech && <Badge tone="neutral">{PART_OF_SPEECH_LABELS[meaning.partOfSpeech]}</Badge>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Definition</h2>
              <p className="whitespace-pre-wrap text-ink">{meaning.definitionEn || '—'}</p>
            </div>
            <div>
              <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Turkish Translation</h2>
              <p className="whitespace-pre-wrap text-ink">{meaning.definitionTr || '—'}</p>
            </div>
          </div>

          {meaning.examples.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Example Sentences</h2>
              <ul className="space-y-2">
                {meaning.examples.map((ex) => (
                  <li key={ex.id} className="rounded-lg bg-paper px-3 py-2 text-ink">
                    <HighlightedSentence text={ex.text} highlightSpans={ex.highlightSpans} />
                    {ex.source === 'AI' && <span className="ml-2 text-xs text-ink-soft">✨ AI</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      ))}

      {card.collocations && (
        <Panel>
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Collocations &amp; Context</h2>
          <p className="whitespace-pre-wrap text-ink">{card.collocations}</p>
        </Panel>
      )}

      {(card.synonyms || card.antonyms) && (
        <div className="grid gap-5 sm:grid-cols-2">
          {card.synonyms && (
            <Panel>
              <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Synonyms</h2>
              <p className="whitespace-pre-wrap text-ink">{card.synonyms}</p>
            </Panel>
          )}
          {card.antonyms && (
            <Panel>
              <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Antonyms</h2>
              <p className="whitespace-pre-wrap text-ink">{card.antonyms}</p>
            </Panel>
          )}
        </div>
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
