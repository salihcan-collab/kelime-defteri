'use client';

import { useTTS } from '@/hooks/useTTS';

/** Speaker-with-sound-waves icon — replaces the old 🔊 emoji, which rendered inconsistently across platforms/themes. */
function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.3 5.7a9 9 0 0 1 0 12.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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
            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition hover:opacity-80 disabled:opacity-40'
            : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition hover:opacity-80 disabled:opacity-40'
        }
      >
        <SpeakerIcon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
      {ipa && <span className="font-mono text-sm text-ink-soft">{ipa}</span>}
    </div>
  );
}
