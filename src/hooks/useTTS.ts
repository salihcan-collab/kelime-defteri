'use client';

import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Pronunciation playback. Prefers a real recorded audio clip (from the
 * free dictionary API, resolved server-side and stored on the card) and
 * falls back to the browser's built-in Web Speech API (SpeechSynthesis)
 * for words with no recorded clip — zero extra API cost either way.
 */
export function useTTS() {
  const ttsRate = useSettingsStore((s) => s.ttsRate);

  const supported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = ttsRate;
      window.speechSynthesis.speak(utterance);
    },
    [supported, ttsRate],
  );

  const play = useCallback(
    (word: string, audioUrl?: string | null) => {
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(() => speak(word));
        return;
      }
      speak(word);
    },
    [speak],
  );

  return { play, speak, supported };
}
