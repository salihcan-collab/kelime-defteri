'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const fontStyle = useSettingsStore((s) => s.fontStyle);
  const hydrateFromServer = useSettingsStore((s) => s.hydrateFromServer);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontStyle);
  }, [fontStyle]);

  // Reconcile with server-stored preferences once on first load (e.g. a
  // fresh browser with no localStorage yet, or settings changed elsewhere).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.settings) return;
        hydrateFromServer({
          theme: data.settings.theme,
          fontStyle: data.settings.fontStyle,
          highlightStyle: data.settings.highlightStyle,
          ttsRate: data.settings.ttsRate,
          dailyGoal: data.settings.dailyGoal,
        });
      })
      .catch(() => {
        /* offline / first run without a DB yet — local defaults are fine */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
