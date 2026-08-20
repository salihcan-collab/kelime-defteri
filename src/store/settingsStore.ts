'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'sakura' | 'sage' | 'latte' | 'lavender' | 'ocean' | 'midnight';
export type FontStyle = 'sans' | 'serif' | 'rounded' | 'mono';
export type HighlightStyleValue = 'BOLD' | 'UNDERLINE' | 'COLOR' | 'BOLD_UNDERLINE';

interface SettingsState {
  theme: ThemeName;
  fontStyle: FontStyle;
  highlightStyle: HighlightStyleValue;
  ttsRate: number;
  dailyGoal: number;
  hydratedFromServer: boolean;
  setTheme: (theme: ThemeName) => void;
  setFontStyle: (fontStyle: FontStyle) => void;
  setHighlightStyle: (style: HighlightStyleValue) => void;
  setTtsRate: (rate: number) => void;
  setDailyGoal: (goal: number) => void;
  hydrateFromServer: (settings: Partial<SettingsState>) => void;
}

/**
 * Persisted locally (localStorage) so the correct theme/font paints
 * instantly on load with no flash-of-wrong-theme, and mirrored to the
 * server (Settings table) via PATCH /api/settings so the same
 * preferences and progress persist across devices/browsers too.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'sakura',
      fontStyle: 'sans',
      highlightStyle: 'BOLD_UNDERLINE',
      ttsRate: 0.95,
      dailyGoal: 10,
      hydratedFromServer: false,
      setTheme: (theme) => {
        set({ theme });
        void fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }) });
      },
      setFontStyle: (fontStyle) => {
        set({ fontStyle });
        void fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fontStyle }) });
      },
      setHighlightStyle: (highlightStyle) => {
        set({ highlightStyle });
        void fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ highlightStyle }),
        });
      },
      setTtsRate: (ttsRate) => {
        set({ ttsRate });
        void fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ttsRate }) });
      },
      setDailyGoal: (dailyGoal) => {
        set({ dailyGoal });
        void fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dailyGoal }) });
      },
      hydrateFromServer: (settings) => set({ ...settings, hydratedFromServer: true }),
    }),
    { name: 'kelime-defteri-settings' },
  ),
);
