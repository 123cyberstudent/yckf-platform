import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await backendFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Password reset request failed' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || 'If an account exists with that email, a reset code has been sent.',
      delivered: payload?.delivered !== false,
      code: payload?.code,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
