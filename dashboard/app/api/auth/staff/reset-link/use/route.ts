import { NextRequest, NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await backendFetch('/api/auth/staff/reset-link/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Password reset failed' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || 'Password reset successfully.',
    })
  } catch (error) {
    console.error('Staff reset link use error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
