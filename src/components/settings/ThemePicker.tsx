'use client';

import clsx from 'clsx';
import { useSettingsStore, type ThemeName } from '@/store/settingsStore';

const THEMES: { id: ThemeName; label: string; swatch: [string, string, string] }[] = [
  { id: 'sakura', label: 'Sakura', swatch: ['#FBF3F0', '#E48C99', '#3A2E2C'] },
  { id: 'sage', label: 'Sage', swatch: ['#F3F6F1', '#769E70', '#2E332C'] },
  { id: 'latte', label: 'Latte', swatch: ['#F7F1E8', '#C08552', '#3B2E22'] },
  { id: 'lavender', label: 'Lavender', swatch: ['#F5F1FA', '#9179C4', '#322C3D'] },
  { id: 'ocean', label: 'Ocean', swatch: ['#EFF5F7', '#4F9DB0', '#1F2E33'] },
  { id: 'midnight', label: 'Midnight', swatch: ['#1E212B', '#8FA6D9', '#E7E3DA'] },
];

export function ThemePicker() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          className={clsx(
            'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition',
            theme === t.id ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/50',
          )}
        >
          <div className="flex gap-1">
            {t.swatch.map((c, i) => (
              <span key={i} className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-sm font-medium text-ink">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
