import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrCreateSettings } from '@/lib/settings';
import { getSession } from '@/lib/auth';
import { AuthedShell } from '@/components/layout/AuthedShell';
import { Panel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VocabCardListItem } from '@/components/vocab/VocabCardListItem';
import type { CardWithRelations } from '@/types';

export const dynamic = 'force-dynamic';

async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, due, mastered, learning, reviewedToday, settings, recentCards, dueCards] = await Promise.all([
    prisma.card.count({ where: { userId } }),
    prisma.card.count({ where: { userId, dueAt: { lte: now } } }),
    prisma.card.count({ where: { userId, status: 'MASTERED' } }),
    prisma.card.count({ where: { userId, status: 'LEARNING' } }),
    prisma.reviewLog.count({ where: { userId, reviewedAt: { gte: startOfDay } } }),
    getOrCreateSettings(userId),
    prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { examples: true, tags: { include: { tag: true } } },
    }),
    prisma.card.findMany({
      where: { userId, dueAt: { lte: now } },
      orderBy: { dueAt: 'asc' },
      take: 5,
      include: { examples: true, tags: { include: { tag: true } } },
    }),
  ]);

  return { total, due, mastered, learning, reviewedToday, settings, recentCards, dueCards };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { total, due, mastered, learning, reviewedToday, settings, recentCards, dueCards } = await getDashboardData(session.userId);
  const goalPct = Math.min(100, Math.round((reviewedToday / Math.max(1, settings.dailyGoal)) * 100));

  return (
    <AuthedShell>
      <div className="space-y-6">
        <Panel className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-ink">Welcome back 👋</h1>
            <p className="mt-1 text-ink-soft">
              {due > 0 ? `You have ${due} card${due === 1 ? '' : 's'} due for review.` : 'All caught up — no reviews due right now.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/review">
              <Button disabled={due === 0}>🧠 Start review {due > 0 && `(${due})`}</Button>
            </Link>
            <Link href="/cards/new">
              <Button variant="secondary">➕ Add word</Button>
            </Link>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total words" value={total} icon="📚" />
          <StatCard label="Mastered" value={mastered} icon="🏆" />
          <StatCard label="Learning" value={learning} icon="🌱" />
          <StatCard label="Streak" value={`${settings.currentStreak}d`} icon="🔥" />
        </div>

        <Panel>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-ink-soft">Today&rsquo;s goal</h2>
            <span className="text-sm text-ink-soft">
              {reviewedToday} / {settings.dailyGoal} reviews
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${goalPct}%` }} />
          </div>
        </Panel>

        {dueCards.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-ink">Up next</h2>
              <Link href="/review" className="text-sm text-accent hover:underline">
                Review all →
              </Link>
            </div>
            <div className="space-y-2">
              {dueCards.map((card) => (
                <VocabCardListItem key={card.id} card={card as unknown as CardWithRelations} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-ink">Recently added</h2>
            <Link href="/cards" className="text-sm text-accent hover:underline">
              Browse notebook →
            </Link>
          </div>
          {recentCards.length === 0 ? (
            <Panel className="text-center text-ink-soft">
              Your notebook is empty. <Link href="/cards/new" className="text-accent hover:underline">Add your first word</Link> to get started.
            </Panel>
          ) : (
            <div className="space-y-2">
              {recentCards.map((card) => (
                <VocabCardListItem key={card.id} card={card as unknown as CardWithRelations} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AuthedShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Panel className="text-center">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 font-heading text-2xl font-semibold text-ink">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </Panel>
  );
}
