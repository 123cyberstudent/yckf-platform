import { NextRequest } from 'next/server';
import { backendFetch } from '@/lib/backend';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('yckf-auth-token')?.value;
  return backendFetch('/api/admin/login-logs/stats', { method: 'GET' }, token);
}
