import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { AuthedShell } from '@/components/layout/AuthedShell';
import { VocabCardView } from '@/components/vocab/VocabCardView';
import type { CardWithRelations } from '@/types';

export const dynamic = 'force-dynamic';

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { examples: { orderBy: { order: 'asc' } }, tags: { include: { tag: true } } },
  });
  if (!card || card.userId !== session.userId) notFound();
  return (
    <AuthedShell>
      <VocabCardView card={card as unknown as CardWithRelations} />
    </AuthedShell>
  );
}
