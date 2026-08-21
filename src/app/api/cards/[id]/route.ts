import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cardInputSchema } from '@/lib/validation';
import { findWordSpans, serializeSpans } from '@/lib/highlight';
import { requireSession } from '@/lib/requireSession';

const cardInclude = {
  meanings: {
    orderBy: { order: 'asc' as const },
    include: { examples: { orderBy: { order: 'asc' as const } } },
  },
  tags: { include: { tag: true } },
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id }, include: cardInclude });
  if (!card || card.userId !== auth.session.userId) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }
  return NextResponse.json({ card });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;
  const { userId } = auth.session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = cardInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid card data', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const tagIds = await Promise.all(
    data.tags.map(async (name) => {
      const tag = await prisma.tag.upsert({
        where: { userId_name: { userId, name: name.toLowerCase() } },
        update: {},
        create: { userId, name: name.toLowerCase() },
      });
      return tag.id;
    }),
  );

  const card = await prisma.$transaction(async (tx) => {
    await tx.tagsOnCards.deleteMany({ where: { cardId: id } });
    // Cascades to each meaning's examples too (ExampleSentence.meaning has onDelete: Cascade).
    await tx.meaning.deleteMany({ where: { cardId: id } });

    return tx.card.update({
      where: { id },
      data: {
        vocabulary: data.vocabulary,
        ipa: data.ipa || null,
        audioUrl: data.audioUrl || null,
        mnemonic: data.mnemonic || null,
        collocations: data.collocations || null,
        notes: data.notes || null,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        meanings: {
          create: data.meanings.map((meaning, mi) => ({
            order: mi,
            partOfSpeech: meaning.partOfSpeech || null,
            ipa: meaning.ipa || null,
            label: meaning.label || null,
            cefr: meaning.cefr || null,
            definitionEn: meaning.definitionEn || null,
            definitionTr: meaning.definitionTr || null,
            synonyms: meaning.synonyms || null,
            antonyms: meaning.antonyms || null,
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
  });

  return NextResponse.json({ card });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.session.userId) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }
  await prisma.card.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
