export type Span = [number, number];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds character spans in `sentence` that correspond to the target
 * vocabulary word, so occurrences can be highlighted (bold/underline/color)
 * regardless of simple inflection ("run" also matches "running", "runs").
 *
 * This is a lightweight prefix match, not full stemming — irregular forms
 * ("go" -> "went") won't be caught automatically. Spans are always
 * recomputed and stored explicitly (see `ExampleSentence.highlightSpans`)
 * so a user can manually correct a miss without losing the rest of the
 * sentence.
 */
export function findWordSpans(sentence: string, word: string): Span[] {
  const trimmed = word.trim();
  if (!trimmed) return [];

  const isPhrase = /\s/.test(trimmed);
  const pattern = isPhrase
    ? escapeRegExp(trimmed)
    : `\\b${escapeRegExp(trimmed)}\\w*`;

  const re = new RegExp(pattern, 'gi');
  const spans: Span[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(sentence)) !== null) {
    spans.push([match.index, match.index + match[0].length]);
    if (match[0].length === 0) re.lastIndex++;
  }
  return spans;
}

export function serializeSpans(spans: Span[]): string {
  return JSON.stringify(spans);
}

export function parseSpans(raw: string | null | undefined): Span[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Span[];
    return [];
  } catch {
    return [];
  }
}

export interface SentenceSegment {
  text: string;
  highlighted: boolean;
}

/** Splits sentence text into segments for rendering, given highlight spans. */
export function segmentSentence(text: string, spans: Span[]): SentenceSegment[] {
  if (!spans.length) return [{ text, highlighted: false }];

  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const segments: SentenceSegment[] = [];
  let cursor = 0;

  for (const [start, end] of sorted) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), highlighted: false });
    segments.push({ text: text.slice(start, end), highlighted: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });

  return segments;
}
