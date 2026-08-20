'use client';

import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

const baseFieldClasses =
  'w-full rounded-xl border border-line bg-paper-alt px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

export function FieldLabel({
  children,
  htmlFor,
  hint,
  action,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {children}
        {hint && <span className="ml-1.5 text-xs font-normal text-ink-soft">{hint}</span>}
      </label>
      {action}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(baseFieldClasses, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(baseFieldClasses, 'resize-y', props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(baseFieldClasses, 'cursor-pointer', props.className)} />;
}

export function FieldWrapper({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
