import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { AuthedShell } from '@/components/layout/AuthedShell';
import { VocabForm } from '@/components/vocab/VocabForm';
import { isAiConfigured } from '@/lib/openai';
import type { CardWithRelations } from '@/types';

export const dynamic = 'force-dynamic';

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      meanings: {
        orderBy: { order: 'asc' },
        include: { examples: { orderBy: { order: 'asc' } }, tags: { include: { tag: true } } },
      },
    },
  });
  if (!card || card.userId !== session.userId) notFound();
  return (
    <AuthedShell>
      <VocabForm card={card as unknown as CardWithRelations} aiConfigured={isAiConfigured()} />
    </AuthedShell>
  );
}
