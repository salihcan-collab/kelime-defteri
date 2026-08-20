'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: '📔' },
  { href: '/cards', label: 'Notebook', icon: '📚' },
  { href: '/review', label: 'Review', icon: '🧠' },
  { href: '/quiz', label: 'Practice', icon: '✍️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold text-ink">
          <span aria-hidden>📖</span>
          Kelime Defteri
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {LINKS.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-accent text-accent-ink shadow-notebook' : 'text-ink-soft hover:bg-accent-soft hover:text-ink',
                )}
              >
                <span aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
