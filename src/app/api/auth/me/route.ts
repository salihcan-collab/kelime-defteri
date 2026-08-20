import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MAX_USERS, getSession } from '@/lib/auth';

/** Used by the login/signup pages to show whether a second account slot is still open. */
export async function GET() {
  const session = await getSession();
  const userCount = await prisma.user.count();

  return NextResponse.json({
    user: session ? { id: session.userId, email: session.email } : null,
    accountsUsed: userCount,
    maxAccounts: MAX_USERS,
    signupOpen: userCount < MAX_USERS,
  });
}
