'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { FieldLabel, FieldWrapper, TextInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not log in');
      router.push(searchParams.get('next') || '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in');
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your notebook.">
      <form onSubmit={handleSubmit}>
        <FieldWrapper>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <TextInput id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <TextInput id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </FieldWrapper>
        {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full justify-center">
          Log in
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        New here?{' '}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
