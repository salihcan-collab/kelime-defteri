import { AuthedShell } from '@/components/layout/AuthedShell';
import { VocabForm } from '@/components/vocab/VocabForm';
import { isAiConfigured } from '@/lib/openai';

export default function NewCardPage() {
  return (
    <AuthedShell>
      <VocabForm aiConfigured={isAiConfigured()} />
    </AuthedShell>
  );
}
