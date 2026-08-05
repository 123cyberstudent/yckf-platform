import { NextResponse } from 'next/server'
import { getBackendAuthToken } from '@/lib/backend'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = await getBackendAuthToken()
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 })
  }
  return NextResponse.json({ token })
}
