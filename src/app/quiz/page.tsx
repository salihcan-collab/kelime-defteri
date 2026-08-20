import { AuthedShell } from '@/components/layout/AuthedShell';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { isAiConfigured } from '@/lib/openai';

export default function QuizPage() {
  return (
    <AuthedShell>
      <div>
        <h1 className="mb-4 font-heading text-2xl font-semibold text-ink">Practice</h1>
        <QuizRunner aiConfigured={isAiConfigured()} />
      </div>
    </AuthedShell>
  );
}
