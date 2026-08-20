import { AuthedShell } from '@/components/layout/AuthedShell';
import { CardsBrowser } from '@/components/vocab/CardsBrowser';

export default function CardsPage() {
  return (
    <AuthedShell>
      <CardsBrowser />
    </AuthedShell>
  );
}
