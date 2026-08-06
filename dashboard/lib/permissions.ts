'use client';

let cachedRole: string | null = null;
let fetchPromise: Promise<string | null> | null = null;

async function fetchRole(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const json = await res.json();
    const role = json?.data?.role ?? json?.role ?? null;
    if (typeof role === 'string') return role.toLowerCase();
    return null;
  } catch {
    return null;
  }
}

export async function getRoleFromCookie(): Promise<string | null> {
  if (cachedRole !== null) return cachedRole;
  if (!fetchPromise) {
    fetchPromise = fetchRole().then((role) => {
      cachedRole = role;
      fetchPromise = null;
      return role;
    });
  }
  return fetchPromise;
}

export async function isSuperAdmin(): Promise<boolean> {
  const role = await getRoleFromCookie();
  return role === 'super_admin';
}

export async function isAdmin(): Promise<boolean> {
  const role = await getRoleFromCookie();
  return role === 'admin' || role === 'super_admin';
}

export async function isStaff(): Promise<boolean> {
  const role = await getRoleFromCookie();
  return role === 'super_admin' || role === 'admin' || role === 'volunteer' || role === 'investigator';
}

export async function isVolunteer(): Promise<boolean> {
  const role = await getRoleFromCookie();
  return role === 'volunteer';
}

export async function canModify(): Promise<boolean> {
  const role = await getRoleFromCookie();
  return role === 'super_admin' || role === 'admin';
}

export async function canDelete(): Promise<boolean> {
  const role = await getRoleFromCookie();
  return role === 'super_admin' || role === 'admin';
}

export function resetCachedRole() {
  cachedRole = null;
  fetchPromise = null;
}
