import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cardInputSchema } from '@/lib/validation';
import { findWordSpans, serializeSpans } from '@/lib/highlight';
import type { Prisma } from '@prisma/client';
import type { CardStatus } from '@/types';

const cardInclude = {
  examples: { orderBy: { order: 'asc' as const } },
  tags: { include: { tag: true } },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q')?.trim();
  const tag = searchParams.get('tag');
  const status = searchParams.get('status');
  const due = searchParams.get('due'); // "true" -> only due-now cards

  const where: Prisma.CardWhereInput = {};
  if (search) {
    where.OR = [
      { vocabulary: { contains: search } },
      { definitionEn: { contains: search } },
      { definitionTr: { contains: search } },
    ];
  }
  if (tag) where.tags = { some: { tag: { name: tag } } };
  if (status) where.status = status as CardStatus;
  if (due === 'true') where.dueAt = { lte: new Date() };

  const cards = await prisma.card.findMany({
    where,
    include: cardInclude,
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = cardInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid card data', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const tagConnections = await Promise.all(
    data.tags.map(async (name) => {
      const tag = await prisma.tag.upsert({
        where: { name: name.toLowerCase() },
        update: {},
        create: { name: name.toLowerCase() },
      });
      return tag.id;
    }),
  );

  const card = await prisma.card.create({
    data: {
      vocabulary: data.vocabulary,
      ipa: data.ipa || null,
      audioUrl: data.audioUrl || null,
      definitionEn: data.definitionEn || null,
      definitionTr: data.definitionTr || null,
      partOfSpeech: data.partOfSpeech || null,
      mnemonic: data.mnemonic || null,
      collocations: data.collocations || null,
      notes: data.notes || null,
      tags: { create: tagConnections.map((tagId) => ({ tagId })) },
      examples: {
        create: data.examples.map((ex, i) => ({
          text: ex.text,
          source: ex.source ?? 'USER',
          order: i,
          highlightSpans: serializeSpans(findWordSpans(ex.text, data.vocabulary)),
        })),
      },
    },
    include: cardInclude,
  });

  return NextResponse.json({ card }, { status: 201 });
}
