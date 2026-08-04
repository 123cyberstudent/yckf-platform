import { NextResponse } from 'next/server';
import { backendFetch, getBackendAuthToken, refreshAccessToken } from '@/lib/backend';

async function fetchRoleFromBackend(token: string): Promise<string | null> {
  const res = await backendFetch('/api/auth/me', {}, token);
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  if (!json) return null;
  const role = json?.data?.role ?? json?.role;
  return typeof role === 'string' ? role : null;
}

export async function getRequestRole(): Promise<string | null> {
  const token = await getBackendAuthToken();
  if (!token) return null;
  try {
    const role = await fetchRoleFromBackend(token);
    if (role) return role;
    // The access token may have expired; refresh once and retry so admin
    // requests do not fail spuriously mid-session.
    const freshToken = await refreshAccessToken();
    if (freshToken) return fetchRoleFromBackend(freshToken);
    return null;
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
