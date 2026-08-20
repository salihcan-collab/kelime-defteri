import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSettings } from '@/lib/settings';
import { requireSession } from '@/lib/requireSession';

export async function GET() {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;
  const { userId } = auth.session;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, due, mastered, learning, reviewedToday, settings] = await Promise.all([
    prisma.card.count({ where: { userId } }),
    prisma.card.count({ where: { userId, dueAt: { lte: now } } }),
    prisma.card.count({ where: { userId, status: 'MASTERED' } }),
    prisma.card.count({ where: { userId, status: 'LEARNING' } }),
    prisma.reviewLog.count({ where: { userId, reviewedAt: { gte: startOfDay } } }),
    getOrCreateSettings(userId),
  ]);

  return NextResponse.json({
    total,
    due,
    mastered,
    learning,
    reviewedToday,
    dailyGoal: settings.dailyGoal,
    currentStreak: settings.currentStreak,
    longestStreak: settings.longestStreak,
    totalReviews: settings.totalReviews,
  });
}
