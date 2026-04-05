import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Wrap API handlers with auth check. Returns null if unauthorized.
export async function withAuth(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, response: null };
}

// Only allow SUPER_ADMIN
export async function withSuperAdmin(request: NextRequest) {
  const { session, response } = await withAuth(request);
  if (!session) return { session: null, response };
  if (session.role !== 'SUPER_ADMIN') {
    return { session: null, response: NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 }) };
  }
  return { session, response: null };
}
