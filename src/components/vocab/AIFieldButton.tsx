'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { AiFillableField } from '@/types';

/**
 * The core of the "modular hybrid" AI experience: sits next to a single
 * field and, on click, generates *only* that field via
 * POST /api/ai/generate-field — every other field on the card is left
 * untouched. Disabled with an explanatory title when there's no word yet
 * to generate from, or the server has no OPENAI_API_KEY configured.
 */
export function AIFieldButton({
  field,
  word,
  context,
  disabled,
  onResult,
  label = 'AI fill',
}: {
  field: Exclude<AiFillableField, 'all'>;
  word: string;
  context?: { definitionEn?: string; partOfSpeech?: string };
  disabled?: boolean;
  onResult: (result: Record<string, unknown>) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!word.trim()) {
      setError('Enter the vocabulary word first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, word, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      onResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="secondary" size="sm" loading={loading} disabled={disabled} onClick={handleClick} title="Fill only this field with AI, without touching the rest of the card">
        ✨ {label}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
