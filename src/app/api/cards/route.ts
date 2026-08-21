import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cardInputSchema } from '@/lib/validation';
import { findWordSpans, serializeSpans } from '@/lib/highlight';
import { requireSession } from '@/lib/requireSession';
import type { Prisma } from '@prisma/client';
import type { CardStatus } from '@/types';

const cardInclude = {
  meanings: {
    orderBy: { order: 'asc' as const },
    include: { examples: { orderBy: { order: 'asc' as const } } },
  },
  tags: { include: { tag: true } },
};

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q')?.trim();
  const tag = searchParams.get('tag');
  const status = searchParams.get('status');
  const due = searchParams.get('due'); // "true" -> only due-now cards

  const where: Prisma.CardWhereInput = { userId: auth.session.userId };
  if (search) {
    where.OR = [
      { vocabulary: { contains: search } },
      {
        meanings: {
          some: {
            OR: [{ definitionEn: { contains: search } }, { definitionTr: { contains: search } }],
          },
        },
      },
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
  const auth = await requireSession();
  if ('response' in auth) return auth.response;
  const { userId } = auth.session;

  const body = await req.json().catch(() => null);
  const parsed = cardInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid card data', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const tagConnections = await Promise.all(
    data.tags.map(async (name) => {
      const tag = await prisma.tag.upsert({
        where: { userId_name: { userId, name: name.toLowerCase() } },
        update: {},
        create: { userId, name: name.toLowerCase() },
      });
      return tag.id;
    }),
  );

  const card = await prisma.card.create({
    data: {
      userId,
      vocabulary: data.vocabulary,
      ipa: data.ipa || null,
      audioUrl: data.audioUrl || null,
      mnemonic: data.mnemonic || null,
      collocations: data.collocations || null,
      synonyms: data.synonyms || null,
      antonyms: data.antonyms || null,
      notes: data.notes || null,
      tags: { create: tagConnections.map((tagId) => ({ tagId })) },
      meanings: {
        create: data.meanings.map((meaning, mi) => ({
          order: mi,
          partOfSpeech: meaning.partOfSpeech || null,
          definitionEn: meaning.definitionEn || null,
          definitionTr: meaning.definitionTr || null,
          examples: {
            create: meaning.examples.map((ex, i) => ({
              text: ex.text,
              source: ex.source ?? 'USER',
              order: i,
              highlightSpans: serializeSpans(findWordSpans(ex.text, data.vocabulary)),
            })),
          },
        })),
      },
    },
    include: cardInclude,
  });

  return NextResponse.json({ card }, { status: 201 });
}
