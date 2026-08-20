import { createHash } from 'crypto';
import { prisma } from './prisma';

/**
 * Persistent cache for AI (and dictionary-API) responses, backed by the
 * AICache table. Keyed on a deterministic hash of `kind` + the normalized
 * input, so re-requesting the same field for the same word never spends a
 * completion token twice. This is the server-side half of the "local
 * caching" requirement; see also the client-side quiz cache in
 * src/hooks/useQuizCache.ts for read-mostly UI data.
 */

/** Recursively sorts object keys so semantically-identical inputs hash the same. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function cacheKeyFor(kind: string, input: unknown): string {
  const normalized = stableStringify(input);
  return createHash('sha256').update(`${kind}:${normalized}`).digest('hex');
}

export async function getCached<T>(kind: string, input: unknown): Promise<T | null> {
  const cacheKey = cacheKeyFor(kind, input);
  const row = await prisma.aICache.findUnique({ where: { cacheKey } });
  if (!row) return null;
  try {
    return JSON.parse(row.response) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(kind: string, input: unknown, value: T): Promise<void> {
  const cacheKey = cacheKeyFor(kind, input);
  const response = JSON.stringify(value);
  await prisma.aICache.upsert({
    where: { cacheKey },
    update: { response },
    create: { cacheKey, kind, response },
  });
}
