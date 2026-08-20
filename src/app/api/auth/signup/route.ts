import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { signupSchema } from '@/lib/validation';
import { MAX_USERS, SESSION_COOKIE, createSessionToken, hashPassword, sessionCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid signup details';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists — try logging in instead.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    // Re-check the count inside the transaction (not just before it) so two
    // signups landing at the same instant can't both slip past MAX_USERS.
    user = await prisma.$transaction(async (tx) => {
      const count = await tx.user.count();
      if (count >= MAX_USERS) {
        throw new Error('ACCOUNT_LIMIT_REACHED');
      }
      return tx.user.create({
        data: {
          email,
          passwordHash,
          name: name || null,
          settings: { create: {} },
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'ACCOUNT_LIMIT_REACHED') {
      return NextResponse.json(
        { error: `This notebook is limited to ${MAX_USERS} accounts, and both are already taken. Ask an existing member to share access instead.` },
        { status: 403 },
      );
    }
    throw err;
  }

  const token = await createSessionToken({ userId: user.id, email: user.email });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
}
