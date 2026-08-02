import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await backendFetch('/api/auth/staff/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Verification failed' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      valid: !!payload?.valid,
      disabled: !!payload?.disabled,
    })
  } catch (error) {
    console.error('Staff code verify error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
