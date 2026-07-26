import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('yckf-auth-token')?.value;
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  return backendFetch(`/api/admin/login-logs${searchParams ? '?' + searchParams : ''}`, { method: 'GET' }, token);
}
