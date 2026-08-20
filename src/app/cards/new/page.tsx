import { VocabForm } from '@/components/vocab/VocabForm';
import { isAiConfigured } from '@/lib/openai';

export default function NewCardPage() {
  return <VocabForm aiConfigured={isAiConfigured()} />;
}
