import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getBackendAuthToken } from '@/lib/backend';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production'
);

export async function getRequestRole(): Promise<string | null> {
  const token = await getBackendAuthToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export async function isSuperAdminRequest(): Promise<boolean> {
  return (await getRequestRole()) === 'SUPER_ADMIN';
}

export async function requireSuperAdmin(): Promise<NextResponse | null> {
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }
  return null;
}
