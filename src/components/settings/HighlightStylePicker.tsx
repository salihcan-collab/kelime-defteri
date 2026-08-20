'use client';

import clsx from 'clsx';
import { useSettingsStore, type HighlightStyleValue } from '@/store/settingsStore';
import { HIGHLIGHT_STYLE_LABELS } from '@/types';

const STYLES: HighlightStyleValue[] = ['BOLD', 'UNDERLINE', 'COLOR', 'BOLD_UNDERLINE'];

export function HighlightStylePicker() {
  const highlightStyle = useSettingsStore((s) => s.highlightStyle);
  const setHighlightStyle = useSettingsStore((s) => s.setHighlightStyle);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STYLES.map((style) => (
        <button
          key={style}
          type="button"
          onClick={() => setHighlightStyle(style)}
          className={clsx(
            'rounded-xl border p-3 text-center transition',
            highlightStyle === style ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/50',
          )}
        >
          <p className="text-ink">
            The word is{' '}
            <mark
              className={clsx('bg-transparent text-ink', {
                'font-bold': style === 'BOLD' || style === 'BOLD_UNDERLINE',
                'underline decoration-2 underline-offset-2': style === 'UNDERLINE' || style === 'BOLD_UNDERLINE',
                'bg-highlight/80': style === 'COLOR',
              })}
            >
              resilient
            </mark>
            .
          </p>
          <div className="mt-1 text-xs text-ink-soft">{HIGHLIGHT_STYLE_LABELS[style]}</div>
        </button>
      ))}
    </div>
  );
}
