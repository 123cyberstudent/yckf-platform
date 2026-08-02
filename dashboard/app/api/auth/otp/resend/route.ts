// OTP Resend API Route
import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await backendFetch('/api/auth/otp/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Failed to resend code' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: payload,
      challengeId: payload?.challengeId,
      resendAfter: payload?.resendAfter,
    })
  } catch (error) {
    console.error('OTP resend error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while resending' },
      { status: 500 }
    )
  }
}
