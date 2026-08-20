import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Navbar } from './Navbar';

/**
 * Shared chrome (session gate + Navbar) for every authenticated page.
 *
 * This used to be a route-group layout (`src/app/(app)/layout.tsx`) so
 * every protected page could share it without adding a URL segment. That
 * folder name — literal parentheses — turned out to break `@/` path-alias
 * resolution specifically for files inside it on Render's build platform
 * (never reproduced locally, including from a byte-identical fresh
 * clone, but 100% reproducible on Render across multiple attempts and a
 * cache-cleared rebuild). Rather than depend on every hosting platform
 * handling that Next.js convention identically, pages now import this
 * component directly instead of relying on route-group folder structure.
 */
export async function AuthedShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userEmail={session.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
