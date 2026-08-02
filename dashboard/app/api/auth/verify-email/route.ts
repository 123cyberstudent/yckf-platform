import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token') || ''

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing confirmation token' },
        { status: 400 }
      )
    }

    const response = await backendFetch(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`
    )
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Invalid or expired confirmation link' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || 'Email verified successfully.',
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
