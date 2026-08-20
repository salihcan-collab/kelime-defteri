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
  const toneClasses: Record<string, string> = {
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success/15 text-success',
    warn: 'bg-warn/15 text-warn',
    danger: 'bg-danger/15 text-danger',
    neutral: 'bg-paper text-ink-soft border border-line',
  };
  return (
    <span
      className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneClasses[tone], className)}
      {...props}
    />
  );
}
