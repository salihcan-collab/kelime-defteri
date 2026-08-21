import { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('rounded-notebook border border-line bg-card p-5 shadow-notebook', className)}
      {...props}
    />
  );
}

export function Badge({ className, tone = 'accent', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: 'accent' | 'success' | 'warn' | 'danger' | 'neutral' }) {
  // Every tone gets a matching-color border, not just "neutral" — a
  // soft background tint alone can wash out against the card background
  // depending on the active theme, so the outline keeps all badges
  // equally legible and consistent regardless of tone.
  const toneClasses: Record<string, string> = {
    accent: 'bg-accent-soft text-accent border border-accent/30',
    success: 'bg-success/15 text-success border border-success/30',
    warn: 'bg-warn/15 text-warn border border-warn/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    neutral: 'bg-paper text-ink-soft border border-line',
  };
  return (
    <span
      className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneClasses[tone], className)}
      {...props}
    />
  );
}
