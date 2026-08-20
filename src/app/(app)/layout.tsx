import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';

/**
 * Layout for every authenticated page (dashboard, notebook, review, quiz,
 * settings). The middleware already redirects unauthenticated requests
 * before they get here, but re-checking the session server-side keeps this
 * layout correct even if middleware config ever changes — and gets us the
 * user's email to show in the Navbar with no extra client round-trip.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userEmail={session.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
