import { NextRequest, NextResponse } from 'next/server';
import { generateCardField } from '@/lib/ai';
import { AiNotConfiguredError, isAiConfigured } from '@/lib/openai';
import { aiFieldRequestSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'AI is not configured. Set OPENAI_API_KEY on the server.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = aiFieldRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await generateCardField(parsed.data.field, parsed.data.word, parsed.data.context);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('generate-field failed', err);
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 502 });
  }
}
