import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Returns every saved tag, most-used first, so the tag input can offer them as autocomplete options. */
export async function GET() {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { cards: true } } },
    orderBy: { cards: { _count: 'desc' } },
  });
  return NextResponse.json({
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.cards })),
  });
}
