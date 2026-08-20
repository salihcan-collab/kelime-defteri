import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reviewSubmitSchema } from '@/lib/validation';
import { nextSrsState } from '@/lib/srs';
import { updateStreak } from '@/lib/streak';
import { getOrCreateSettings } from '@/lib/settings';
import type { CardStatus } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = reviewSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review payload', issues: parsed.error.flatten() }, { status: 400 });
  }
  const { cardId, rating } = parsed.data;

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  const now = new Date();
  const next = nextSrsState(
    { easeFactor: card.easeFactor, intervalDays: card.intervalDays, repetitions: card.repetitions, status: card.status as CardStatus },
    rating,
    now,
  );

  const [updatedCard] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        status: next.status,
        dueAt: next.dueAt,
        lastReviewedAt: now,
      },
    }),
    prisma.reviewLog.create({
      data: {
        cardId,
        rating,
        intervalBefore: card.intervalDays,
        intervalAfter: next.intervalDays,
        easeBefore: card.easeFactor,
        easeAfter: next.easeFactor,
        reviewedAt: now,
      },
    }),
  ]);

  const settings = await getOrCreateSettings();
  const streak = updateStreak(settings.lastStudyDate, settings.currentStreak, settings.longestStreak, now);
  await prisma.settings.update({
    where: { id: 'singleton' },
    data: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: streak.lastStudyDate,
      totalReviews: { increment: 1 },
    },
  });

  return NextResponse.json({ card: updatedCard, streak: streak.currentStreak });
}
