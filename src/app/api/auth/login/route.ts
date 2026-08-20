import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  const token = await createSessionToken({ userId: user.id, email: user.email });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
