'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { TextInput, TextArea } from '@/components/ui/Field';
import type { QuizQuestion } from '@/types';

/** Renders one quiz question and reports back whether the learner got it right. */
export function QuizQuestionView({ question, onAnswered }: { question: QuizQuestion; onAnswered: (correct: boolean) => void }) {
  if (question.type === 'multiple_choice') return <MCQView question={question} onAnswered={onAnswered} />;
  if (question.type === 'fill_blank') return <FillBlankView question={question} onAnswered={onAnswered} />;
  if (question.type === 'sentence_construction') return <SentenceConstructionView question={question} onAnswered={onAnswered} />;
  return <RecallView question={question} onAnswered={onAnswered} />;
}

function MCQView({ question, onAnswered }: { question: Extract<QuizQuestion, { type: 'multiple_choice' }>; onAnswered: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div>
      <p className="mb-4 text-lg text-ink">{question.prompt}</p>
      <div className="grid gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const showState = selected !== null;
          return (
            <button
              key={i}
              type="button"
              disabled={selected !== null}
              onClick={() => setSelected(i)}
              className={clsx(
                'rounded-xl border px-4 py-2.5 text-left text-sm transition',
                !showState && 'border-line bg-paper-alt hover:border-accent',
                showState && isCorrect && 'border-success bg-success/10 text-success',
                showState && !isCorrect && i === selected && 'border-danger bg-danger/10 text-danger',
                showState && !isCorrect && i !== selected && 'border-line bg-paper-alt opacity-60',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="mt-4 flex justify-end">
          <Button onClick={() => onAnswered(selected === question.correctIndex)}>Next →</Button>
        </div>
      )}
    </div>
  );
}

function FillBlankView({ question, onAnswered }: { question: Extract<QuizQuestion, { type: 'fill_blank' }>; onAnswered: (correct: boolean) => void }) {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);

  const correct = value.trim().toLowerCase() === question.answer.trim().toLowerCase();

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Fill in the blank</p>
      <p className="mb-4 text-lg text-ink">{question.sentence}</p>
      <TextInput value={value} onChange={(e) => setValue(e.target.value)} disabled={checked} placeholder="Type the missing word…" className="max-w-sm" />
      {checked && (
        <p className={clsx('mt-2 text-sm', correct ? 'text-success' : 'text-danger')}>
          {correct ? '✅ Correct!' : `❌ Correct answer: "${question.answer}"`}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        {!checked ? (
          <Button onClick={() => setChecked(true)} disabled={!value.trim()}>
            Check
          </Button>
        ) : (
          <Button onClick={() => onAnswered(correct)}>Next →</Button>
        )}
      </div>
    </div>
  );
}

function SentenceConstructionView({
  question,
  onAnswered,
}: {
  question: Extract<QuizQuestion, { type: 'sentence_construction' }>;
  onAnswered: (correct: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Sentence construction</p>
      <p className="mb-4 text-lg text-ink">{question.prompt}</p>
      <TextArea value={value} onChange={(e) => setValue(e.target.value)} rows={3} placeholder={`Write a sentence using "${question.word}"…`} />
      {revealed && (
        <div className="mt-3 rounded-lg bg-accent-soft/40 p-3 text-sm">
          <span className="font-semibold text-accent">Sample: </span>
          {question.sampleAnswer}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        {!revealed ? (
          <Button variant="outline" onClick={() => setRevealed(true)} disabled={!value.trim()}>
            Compare to sample
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => onAnswered(false)}>
              Needs practice
            </Button>
            <Button onClick={() => onAnswered(true)}>Nailed it →</Button>
          </>
        )}
      </div>
    </div>
  );
}

function RecallView({ question, onAnswered }: { question: Extract<QuizQuestion, { type: 'recall_mnemonic' | 'recall_definition' }>; onAnswered: (correct: boolean) => void }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {question.type === 'recall_mnemonic' ? 'Recall the memory hook' : 'Recall the definition'}
      </p>
      <p className="mb-4 text-lg text-ink">{question.prompt}</p>
      {revealed && (
        <div className="mb-3 rounded-lg bg-accent-soft/40 p-3 text-sm text-ink">{question.answer}</div>
      )}
      <div className="flex justify-end gap-2">
        {!revealed ? (
          <Button variant="outline" onClick={() => setRevealed(true)}>
            Reveal
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => onAnswered(false)}>
              Didn&rsquo;t recall
            </Button>
            <Button onClick={() => onAnswered(true)}>Recalled it →</Button>
          </>
        )}
      </div>
    </div>
  );
}
