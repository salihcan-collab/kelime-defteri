import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VocabForm } from '@/components/vocab/VocabForm';
import { isAiConfigured } from '@/lib/openai';
import type { CardWithRelations } from '@/types';

export const dynamic = 'force-dynamic';

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { examples: { orderBy: { order: 'asc' } }, tags: { include: { tag: true } } },
  });
  if (!card) notFound();
  return <VocabForm card={card as unknown as CardWithRelations} aiConfigured={isAiConfigured()} />;
}
