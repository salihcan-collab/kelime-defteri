import { getCached, setCached } from './cache';

/**
 * Free, keyless dictionary lookup (dictionaryapi.dev) used as the first
 * choice for IPA transcription + a real human-recorded pronunciation
 * audio clip — it costs nothing and is often higher quality than a
 * synthesized guess. AI (see ai.ts) is only used to fill in IPA when a
 * word isn't found here. Results are cached in AICache under kind
 * "dictionary" so a word is only ever fetched once.
 */

export interface DictionaryLookup {
  ipa: string | null;
  audioUrl: string | null;
  found: boolean;
}

interface DictApiPhonetic {
  text?: string;
  audio?: string;
}
interface DictApiEntry {
  phonetic?: string;
  phonetics?: DictApiPhonetic[];
}

export async function lookupDictionary(word: string): Promise<DictionaryLookup> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return { ipa: null, audioUrl: null, found: false };

  const cached = await getCached<DictionaryLookup>('dictionary', normalized);
  if (cached) return cached;

  let result: DictionaryLookup = { ipa: null, audioUrl: null, found: false };

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as DictApiEntry[];
      const entry = data[0];
      const withAudio = entry?.phonetics?.find((p) => p.audio);
      const ipa = entry?.phonetic || entry?.phonetics?.find((p) => p.text)?.text || null;
      const audioUrl = withAudio?.audio ? normalizeAudioUrl(withAudio.audio) : null;
      result = { ipa, audioUrl, found: Boolean(ipa || audioUrl) };
    }
  } catch {
    // Network failure or timeout — fall through and cache the "not found"
    // result briefly isn't ideal, so we simply don't cache failures at all
    // (see below) and let the caller fall back to AI-generated IPA.
    return { ipa: null, audioUrl: null, found: false };
  }

  if (result.found) {
    await setCached('dictionary', normalized, result);
  }
  return result;
}

function normalizeAudioUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}
