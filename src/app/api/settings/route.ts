import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { settingsUpdateSchema } from '@/lib/validation';
import { getOrCreateSettings } from '@/lib/settings';
import { isAiConfigured, AI_MODEL_INFO } from '@/lib/openai';

export async function GET() {
  const settings = await getOrCreateSettings();
  return NextResponse.json({ settings, aiConfigured: isAiConfigured(), model: AI_MODEL_INFO });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings payload', issues: parsed.error.flatten() }, { status: 400 });
  }
  await getOrCreateSettings();
  const settings = await prisma.settings.update({ where: { id: 'singleton' }, data: parsed.data });
  return NextResponse.json({ settings });
}
