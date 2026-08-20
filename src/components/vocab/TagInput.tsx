'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Dynamic tagging input: type + Enter (or comma) to add a tag, backspace
 * on empty input removes the last one. Previously saved tags (fetched
 * from /api/tags) are offered as autocomplete suggestions so vocabulary
 * gets organized under a consistent, growing tag vocabulary instead of
 * near-duplicates.
 */
export function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const [known, setKnown] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setKnown((data.tags ?? []).map((t: { name: string }) => t.name)))
      .catch(() => setKnown([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return known.filter((t) => !value.includes(t) && (q === '' ? true : t.includes(q))).slice(0, 6);
  }, [known, draft, value]);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-paper-alt px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="text-accent/70 hover:text-accent">
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === 'Backspace' && draft === '' && value.length) {
              removeTag(value[value.length - 1]);
            }
          }}
          placeholder={value.length ? '' : 'Add tags… e.g. business, toefl'}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-paper-alt shadow-lift">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-accent-soft"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
