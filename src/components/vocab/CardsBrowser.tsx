'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Panel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, TextInput } from '@/components/ui/Field';
import { VocabFlashCard } from '@/components/vocab/VocabFlashCard';
import { CARD_STATUS_LABELS } from '@/types';
import type { CardWithRelations } from '@/types';

/** The interactive notebook browser (search/filter/list) for the /cards route. */
export function CardsBrowser() {
  return (
    <Suspense fallback={<div className="text-ink-soft">Loading…</div>}>
      <CardsBrowserInner />
    </Suspense>
  );
}

function CardsBrowserInner() {
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<CardWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState(searchParams.get('tag') ?? '');

  useEffect(() => {
    setTag(searchParams.get('tag') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (tag) params.set('tag', tag);
    fetch(`/api/cards?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setCards(data.cards ?? []))
      .finally(() => setLoading(false));
  }, [q, status, tag]);

  const emptyState = !loading && cards.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold text-ink">Notebook</h1>
        <Link href="/cards/new">
          <Button>➕ Add word</Button>
        </Link>
      </div>

      <Panel className="flex flex-wrap items-center gap-3">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vocabulary or definitions…" className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[10rem]">
          <option value="">All statuses</option>
          {Object.entries(CARD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {tag && (
          <button onClick={() => setTag('')} className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
            #{tag} ×
          </button>
        )}
      </Panel>

      {loading ? (
        <Panel className="text-center text-ink-soft">Loading…</Panel>
      ) : emptyState ? (
        <Panel className="text-center text-ink-soft">
          No cards match your filters yet. <Link href="/cards/new" className="text-accent hover:underline">Add a word</Link>.
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <VocabFlashCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
