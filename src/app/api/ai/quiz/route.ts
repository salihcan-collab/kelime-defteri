import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { quizRequestSchema } from '@/lib/validation';
import { generateContextualQuiz } from '@/lib/ai';
import { isAiConfigured } from '@/lib/openai';
import { buildAlgorithmicQuestions } from '@/lib/quiz';
import { requireSession } from '@/lib/requireSession';
import { primaryMeaning } from '@/types';
import type { QuizQuestion, CardWithRelations } from '@/types';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = quizRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid quiz request', issues: parsed.error.flatten() }, { status: 400 });
  }

  const pool = (await prisma.card.findMany({
    where: { userId: auth.session.userId },
    include: { meanings: { include: { examples: true } }, tags: { include: { tag: true } } },
  })) as unknown as CardWithRelations[];

  const targets = pool.filter((c) => parsed.data.cardIds.includes(c.id));
  if (targets.length === 0) {
    return NextResponse.json({ error: 'No matching cards found.' }, { status: 404 });
  }

  // Split the batch: half gets algorithmic MCQ/recall questions (free),
  // the other half gets AI-authored contextual questions (only if
  // requested and configured) — this is the cost-optimization split.
  const half = Math.max(1, Math.floor(targets.length / 2));
  const algoTargets = targets.slice(0, half);
  const aiTargets = targets.slice(half);

  const algoQuestions = buildAlgorithmicQuestions(pool, algoTargets);

  let aiQuestions: QuizQuestion[] = [];
  if (parsed.data.includeAiQuestions && isAiConfigured() && aiTargets.length > 0) {
    try {
      aiQuestions = await generateContextualQuiz(
        aiTargets.map((c) => ({
          id: c.id,
          vocabulary: c.vocabulary,
          definitionEn: primaryMeaning(c)?.definitionEn ?? null,
          definitionTr: primaryMeaning(c)?.definitionTr ?? null,
          mnemonic: c.mnemonic,
        })),
      );
    } catch (err) {
      console.error('AI quiz generation failed, falling back to algorithmic questions', err);
      aiQuestions = buildAlgorithmicQuestions(pool, aiTargets);
    }
  } else {
    aiQuestions = buildAlgorithmicQuestions(pool, aiTargets);
  }

  return NextResponse.json({ questions: shuffle([...algoQuestions, ...aiQuestions]) });
}
