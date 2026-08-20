import { AuthedShell } from '@/components/layout/AuthedShell';
import { ReviewSession } from '@/components/review/ReviewSession';

export default function ReviewPage() {
  return (
    <AuthedShell>
      <div>
        <h1 className="mb-4 font-heading text-2xl font-semibold text-ink">Review</h1>
        <ReviewSession />
      </div>
    </AuthedShell>
  );
}
