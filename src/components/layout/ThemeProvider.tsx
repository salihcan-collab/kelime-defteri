'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/store/settingsStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const fontStyle = useSettingsStore((s) => s.fontStyle);
  const hydratedFromServer = useSettingsStore((s) => s.hydratedFromServer);
  const hydrateFromServer = useSettingsStore((s) => s.hydrateFromServer);
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontStyle);
  }, [fontStyle]);

  // Reconcile with server-stored preferences (e.g. a fresh browser with no
  // localStorage yet, or settings changed elsewhere). This provider lives in
  // the root layout, so its first mount is often the login page itself,
  // before a session cookie exists — that attempt silently no-ops. Logging
  // in is a client-side router.push (no remount), so without retrying on
  // route changes the user's saved theme/font would never apply until a
  // hard refresh. Retries on every route change until it succeeds once.
  useEffect(() => {
    if (hydratedFromServer) return;
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
  }, [pathname, hydratedFromServer, hydrateFromServer]);

  return <>{children}</>;
}
