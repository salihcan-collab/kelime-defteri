import { NextRequest, NextResponse } from 'next/server';
import { generateFullCard, resolvePronunciation } from '@/lib/ai';
import { AiNotConfiguredError, isAiConfigured } from '@/lib/openai';
import { z } from 'zod';

const bodySchema = z.object({ word: z.string().trim().min(1).max(120) });

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'AI is not configured. Set OPENAI_API_KEY on the server.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'A word is required.' }, { status: 400 });

  try {
    const [draft, pronunciation] = await Promise.all([
      generateFullCard(parsed.data.word),
      resolvePronunciation(parsed.data.word),
    ]);

    return NextResponse.json({
      draft: {
        ...draft,
        ipa: pronunciation.ipa || draft.ipa,
        audioUrl: pronunciation.audioUrl,
      },
    });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('generate-card failed', err);
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 502 });
  }
}
