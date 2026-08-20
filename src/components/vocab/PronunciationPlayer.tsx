'use client';

import { useTTS } from '@/hooks/useTTS';

export function PronunciationPlayer({ word, ipa, audioUrl, size = 'md' }: { word: string; ipa?: string | null; audioUrl?: string | null; size?: 'sm' | 'md' }) {
  const { play, supported } = useTTS();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => play(word, audioUrl)}
        disabled={!supported && !audioUrl}
        title="Play pronunciation"
        aria-label={`Play pronunciation of ${word}`}
        className={
          size === 'sm'
            ? 'flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent transition hover:opacity-80 disabled:opacity-40'
            : 'flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent transition hover:opacity-80 disabled:opacity-40'
        }
      >
        🔊
      </button>
      {ipa && <span className="font-mono text-sm text-ink-soft">{ipa}</span>}
    </div>
  );
}
