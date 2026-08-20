import { NextResponse } from 'next/server';
import { getSession, type SessionPayload } from '@/lib/auth';

/**
 * Shared guard for API route handlers. Middleware already blocks
 * unauthenticated requests before they reach here, but route handlers
 * still need the actual userId to scope their queries — this fetches it
 * and returns a ready-to-return 401 response in the (defense-in-depth)
 * case the cookie is missing or invalid.
 */
export async function requireSession(): Promise<{ session: SessionPayload } | { response: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return { response: NextResponse.json({ error: 'Unauthorized — please log in.' }, { status: 401 }) };
  }
  return { session };
}
