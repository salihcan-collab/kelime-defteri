'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: '📔' },
  { href: '/cards', label: 'Notebook', icon: '📚' },
  { href: '/review', label: 'Review', icon: '🧠' },
  { href: '/quiz', label: 'Practice', icon: '✍️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

function useActiveLink(pathname: string) {
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

export function Navbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const isActive = useActiveLink(pathname);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const logoutButton = (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition hover:bg-accent-soft hover:text-ink disabled:opacity-50"
    >
      {loggingOut ? 'Logging out…' : 'Log out'}
    </button>
  );

  return (
    <>
      {/* Top bar: full nav on tablet+; on phones, just branding + account (primary nav moves to the bottom tab bar below). */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <span aria-hidden>📖</span>
            Kelime Defteri
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive(link.href) ? 'bg-accent text-accent-ink shadow-notebook' : 'text-ink-soft hover:bg-accent-soft hover:text-ink',
                )}
              >
                <span aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="hidden truncate sm:inline" title={userEmail}>
              {userEmail}
            </span>
            {logoutButton}
          </div>
        </div>
      </header>

      {/* Bottom tab bar: phones only. Fixed so it's always reachable; AuthedShell adds matching bottom padding. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line/70 bg-paper/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
              isActive(link.href) ? 'text-accent' : 'text-ink-soft',
            )}
          >
            <span className="text-lg leading-none" aria-hidden>
              {link.icon}
            </span>
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
