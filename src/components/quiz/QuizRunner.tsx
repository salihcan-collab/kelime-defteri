'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { QuizQuestionView } from '@/components/quiz/QuizQuestionView';
import type { CardWithRelations, QuizQuestion } from '@/types';

type Stage = 'setup' | 'loading' | 'running' | 'summary';

export function QuizRunner({ aiConfigured }: { aiConfigured: boolean }) {
  const [stage, setStage] = useState<Stage>('setup');
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [count, setCount] = useState(10);
  const [includeAi, setIncludeAi] = useState(aiConfigured);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cards')
      .then((res) => res.json())
      .then((data) => setAvailableCount((data.cards ?? []).length));
  }, []);

  async function startQuiz() {
    setStage('loading');
    setError(null);
    try {
      const cardsRes = await fetch('/api/cards');
      const cardsData = await cardsRes.json();
      const cards: CardWithRelations[] = cardsData.cards ?? [];
      const withDefinitions = cards.filter((c) => c.definitionEn);
      const pool = withDefinitions.length >= 4 ? withDefinitions : cards;
      const chosen = shuffle(pool).slice(0, Math.min(count, pool.length));

      if (chosen.length === 0) {
        setError('Add a few vocabulary cards first — the quiz needs a bank of words to draw from.');
        setStage('setup');
        return;
      }

      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: chosen.map((c) => c.id), includeAiQuestions: includeAi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not build the quiz');
      setQuestions(data.questions ?? []);
      setQIndex(0);
      setCorrectCount(0);
      setStage('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the quiz');
      setStage('setup');
    }
  }

  function handleAnswered(correct: boolean) {
    if (correct) setCorrectCount((c) => c + 1);
    if (qIndex + 1 >= questions.length) {
      setStage('summary');
    } else {
      setQIndex((i) => i + 1);
    }
  }

  if (stage === 'setup') {
    return (
      <Panel className="notebook-lines mx-auto max-w-lg space-y-4">
        <h2 className="font-heading text-lg font-semibold text-ink">Set up practice</h2>
        <p className="text-sm text-ink-soft">
          Mixes multiple-choice, fill-in-the-blank, sentence construction, and memory-hook recall — generated from your own vocabulary bank
          {availableCount !== null && ` (${availableCount} word${availableCount === 1 ? '' : 's'} available)`}.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Number of questions</label>
          <Select value={count} onChange={(e) => setCount(Number(e.target.value))} className="max-w-[10rem]">
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n} questions
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={includeAi} disabled={!aiConfigured} onChange={(e) => setIncludeAi(e.target.checked)} />
          Include AI-generated contextual questions {!aiConfigured && '(requires OPENAI_API_KEY)'}
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={startQuiz} disabled={!availableCount}>
          🚀 Start quiz
        </Button>
      </Panel>
    );
  }

  if (stage === 'loading') {
    return <Panel className="text-center text-ink-soft">Building your quiz…</Panel>;
  }

  if (stage === 'summary') {
    const pct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <Panel className="notebook-lines mx-auto max-w-lg text-center">
        <div className="text-4xl">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📖'}</div>
        <h2 className="mt-2 font-heading text-xl font-semibold text-ink">
          {correctCount} / {questions.length} correct ({pct}%)
        </h2>
        <p className="mt-1 text-ink-soft">
          {pct >= 80 ? 'Excellent recall!' : pct >= 50 ? 'Good progress — keep practicing.' : 'Review these words again soon.'}
        </p>
        <Button className="mt-4" onClick={() => setStage('setup')}>
          New quiz
        </Button>
      </Panel>
    );
  }

  const question = questions[qIndex];
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          Question {qIndex + 1} / {questions.length}
        </span>
        <span>{correctCount} correct so far</span>
      </div>
      <Panel className="notebook-lines min-h-[16rem]">
        <QuizQuestionView key={qIndex} question={question} onAnswered={handleAnswered} />
      </Panel>
    </div>
  );
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
