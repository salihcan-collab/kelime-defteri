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
    include: {
      examples: { orderBy: { order: 'asc' as const } },
      tags: { include: { tag: true } },
    },
  },
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
  // Tags now live on Meaning, not Card — a card matches if any of its
  // senses carries the tag.
  if (tag) where.meanings = { some: { tags: { some: { tag: { name: tag } } } } };
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

  // Each sense carries its own tags now, so resolve/upsert them per meaning
  // rather than once for the whole card.
  const meaningsWithTagIds = await Promise.all(
    data.meanings.map(async (meaning) => {
      const tagIds = await Promise.all(
        meaning.tags.map(async (name) => {
          const tag = await prisma.tag.upsert({
            where: { userId_name: { userId, name: name.toLowerCase() } },
            update: {},
            create: { userId, name: name.toLowerCase() },
          });
          return tag.id;
        }),
      );
      return { meaning, tagIds };
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
      notes: data.notes || null,
      meanings: {
        create: meaningsWithTagIds.map(({ meaning, tagIds }, mi) => ({
          order: mi,
          partOfSpeech: meaning.partOfSpeech || null,
          ipa: meaning.ipa || null,
          label: meaning.label || null,
          cefr: meaning.cefr || null,
          definitionEn: meaning.definitionEn || null,
          definitionTr: meaning.definitionTr || null,
          synonyms: meaning.synonyms || null,
          antonyms: meaning.antonyms || null,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
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
