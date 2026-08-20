'use client';

import clsx from 'clsx';
import { parseSpans, segmentSentence } from '@/lib/highlight';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Renders an example sentence with the target word highlighted according
 * to the user's chosen style: Bold, Underline, Color highlight, or the
 * default Bold & Underline.
 */
export function HighlightedSentence({ text, highlightSpans }: { text: string; highlightSpans: string }) {
  const style = useSettingsStore((s) => s.highlightStyle);
  const segments = segmentSentence(text, parseSpans(highlightSpans));

  return (
    <span>
      {segments.map((segment, i) =>
        segment.highlighted ? (
          <mark
            key={i}
            className={clsx('rounded bg-transparent px-0.5 text-ink', {
              'font-bold': style === 'BOLD' || style === 'BOLD_UNDERLINE',
              underline: style === 'UNDERLINE' || style === 'BOLD_UNDERLINE',
              'decoration-2 underline-offset-2': style === 'UNDERLINE' || style === 'BOLD_UNDERLINE',
              'bg-highlight/80': style === 'COLOR',
            })}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
