import type { PartOfSpeech } from '@/types';

export interface MeaningGroupItem<T> {
  meaning: T;
  index: number;
}

export interface MeaningGroup<T> {
  partOfSpeech: PartOfSpeech | null;
  items: MeaningGroupItem<T>[];
}

/**
 * Groups a card's flat meaning list into part-of-speech buckets for
 * display — e.g. "object" becomes a NOUN group holding its senses and a
 * separate VERB group, each shown as its own header, mirroring how real
 * dictionaries split entries ("1 of 3 noun" / "2 of 3 verb" in
 * Merriam-Webster; a fresh "object noun" vs. "object verb" block in
 * Cambridge). Groups appear in first-occurrence order.
 *
 * Meanings without a part of speech yet (still mid-draft, e.g. a freshly
 * added blank sense in the form before its POS is chosen) each get their
 * own singleton group instead of merging together — a blank POS doesn't
 * mean they're the same sense, it just means the POS hasn't been picked.
 * Once a real POS is chosen, that item joins the matching group on the
 * next render.
 *
 * Carries the original array `index` alongside each meaning so callers
 * (the edit form in particular) can still address individual meanings by
 * their position in the underlying flat list regardless of how they're
 * visually grouped.
 */
export function groupMeaningsByPos<T extends { partOfSpeech: PartOfSpeech | string | null }>(
  meanings: T[],
): MeaningGroup<T>[] {
  const groups: MeaningGroup<T>[] = [];
  const byPos = new Map<string, MeaningGroup<T>>();

  meanings.forEach((meaning, index) => {
    const pos = meaning.partOfSpeech || null;
    if (pos) {
      let group = byPos.get(pos);
      if (!group) {
        group = { partOfSpeech: pos as PartOfSpeech, items: [] };
        byPos.set(pos, group);
        groups.push(group);
      }
      group.items.push({ meaning, index });
    } else {
      groups.push({ partOfSpeech: null, items: [{ meaning, index }] });
    }
  });

  return groups;
}
