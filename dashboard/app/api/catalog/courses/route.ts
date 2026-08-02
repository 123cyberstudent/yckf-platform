import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function GET() {
  try {
    const response = await backendFetch('/api/catalog/courses', { method: 'GET' }, null)

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch courses' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch courses' }, { status: 500 })
  }
}
