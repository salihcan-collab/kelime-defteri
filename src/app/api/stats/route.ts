import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSettings } from '@/lib/settings';

export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, due, mastered, learning, reviewedToday, settings] = await Promise.all([
    prisma.card.count(),
    prisma.card.count({ where: { dueAt: { lte: now } } }),
    prisma.card.count({ where: { status: 'MASTERED' } }),
    prisma.card.count({ where: { status: 'LEARNING' } }),
    prisma.reviewLog.count({ where: { reviewedAt: { gte: startOfDay } } }),
    getOrCreateSettings(),
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
