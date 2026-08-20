import { NextRequest, NextResponse } from 'next/server';
import { resolvePronunciation } from '@/lib/ai';
import { z } from 'zod';

const bodySchema = z.object({ word: z.string().trim().min(1).max(120) });

// Note: this endpoint always attempts the free dictionary lookup even
// without an OpenAI key configured, so pronunciation still works in a
// no-AI deployment; it only skips the AI-IPA fallback in that case.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'A word is required.' }, { status: 400 });

  try {
    const result = await resolvePronunciation(parsed.data.word);
    return NextResponse.json(result);
  } catch (err) {
    console.error('pronunciation lookup failed', err);
    return NextResponse.json({ ipa: null, audioUrl: null, source: 'none' });
  }
}
