'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { FieldLabel, FieldWrapper, TextInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signupOpen, setSignupOpen] = useState(true);
  const [accountsUsed, setAccountsUsed] = useState(0);
  const [maxAccounts, setMaxAccounts] = useState(2);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setSignupOpen(Boolean(data.signupOpen));
        setAccountsUsed(data.accountsUsed ?? 0);
        setMaxAccounts(data.maxAccounts ?? 2);
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords don’t match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create your account');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <AuthShell title="Create your account" subtitle="Checking availability…">
        <div />
      </AuthShell>
    );
  }

  if (!signupOpen) {
    return (
      <AuthShell title="This notebook is full" subtitle={`${accountsUsed} of ${maxAccounts} accounts are already set up.`}>
        <p className="mb-5 text-sm text-ink">
          This deployment only allows {maxAccounts} accounts. If one of them is yours, log in instead — otherwise, ask whoever set this up for access.
        </p>
        <Link href="/login">
          <Button className="w-full justify-center">Go to login</Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle={`Account ${accountsUsed + 1} of ${maxAccounts} for this notebook.`}>
      <form onSubmit={handleSubmit}>
        <FieldWrapper>
          <FieldLabel htmlFor="name">Name (optional)</FieldLabel>
          <TextInput id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <TextInput id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel htmlFor="password" hint="At least 8 characters">Password</FieldLabel>
          <TextInput id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
          <TextInput id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        </FieldWrapper>
        {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full justify-center">
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
