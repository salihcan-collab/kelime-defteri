import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/requireSession';

/** Returns the current user's saved tags, most-used first, for tag-input autocomplete. */
export async function GET() {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const tags = await prisma.tag.findMany({
    where: { userId: auth.session.userId },
    include: { _count: { select: { meanings: true } } },
    orderBy: { meanings: { _count: 'desc' } },
  });
  return NextResponse.json({
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.meanings })),
  });
}
