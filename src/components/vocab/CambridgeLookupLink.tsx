import clsx from 'clsx';

/**
 * Manual cross-check link to a word's real entry on Cambridge Dictionary.
 * Cambridge doesn't publish a public API (and scraping their site would
 * violate their Terms of Service), so this is deliberately just a plain
 * outbound link — the same as bookmarking the page yourself — with
 * nothing to integrate, cache, or maintain. Opens in a new tab so you can
 * cross-check an AI-generated definition in one click.
 */
export function CambridgeLookupLink({ word, className }: { word: string; className?: string }) {
  const trimmed = word.trim();
  const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
  const href = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(slug)}`;

  return (
    <a
      href={trimmed ? href : undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!trimmed}
      title={trimmed ? `Look up "${trimmed}" on Cambridge Dictionary` : 'Type a word first'}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-line bg-transparent px-2.5 py-1 text-xs font-medium text-ink transition-all hover:bg-paper-alt',
        !trimmed && 'pointer-events-none opacity-40',
        className,
      )}
    >
      📖 Cambridge Dictionary
    </a>
  );
}
