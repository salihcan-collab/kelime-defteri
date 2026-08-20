import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VocabCardView } from '@/components/vocab/VocabCardView';
import type { CardWithRelations } from '@/types';

export const dynamic = 'force-dynamic';

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { examples: { orderBy: { order: 'asc' } }, tags: { include: { tag: true } } },
  });
  if (!card) notFound();
  return <VocabCardView card={card as unknown as CardWithRelations} />;
}
