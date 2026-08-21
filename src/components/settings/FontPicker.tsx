'use client';

import clsx from 'clsx';
import { useSettingsStore, type FontStyle } from '@/store/settingsStore';

const FONTS: { id: FontStyle; label: string; sample: string }[] = [
  { id: 'sans', label: 'Clean Sans', sample: 'Aa Bb Cc' },
  { id: 'serif', label: 'Notebook Serif', sample: 'Aa Bb Cc' },
  { id: 'rounded', label: 'Rounded', sample: 'Aa Bb Cc' },
  { id: 'mono', label: 'Typewriter', sample: 'Aa Bb Cc' },
];

export function FontPicker() {
  const fontStyle = useSettingsStore((s) => s.fontStyle);
  const setFontStyle = useSettingsStore((s) => s.setFontStyle);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {FONTS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => setFontStyle(f.id)}
          data-font={f.id}
          className={clsx(
            'rounded-xl border p-3 text-left transition',
            fontStyle === f.id ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/50',
          )}
        >
          <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            {f.sample}
          </div>
          <div className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>
            {f.sample}
          </div>
          <div className="mt-1 text-xs text-ink-soft">{f.label}</div>
        </button>
      ))}
    </div>
  );
}
