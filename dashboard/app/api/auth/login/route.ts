// Login API Route
import { NextResponse } from 'next/server'
import { backendFetch, setBackendAuthCookie, setBackendRefreshCookie } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await backendFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Login failed' },
        { status: response.status }
      )
    }

    if (payload?.accessToken) {
      await setBackendAuthCookie(payload.accessToken)
    }
    if (payload?.refreshToken) {
      await setBackendRefreshCookie(payload.refreshToken)
    }

    return NextResponse.json({
      success: true,
      data: payload?.user || payload,
      accessToken: payload?.accessToken,
      refreshToken: payload?.refreshToken,
      requiresOtp: payload?.requiresOtp,
      challengeId: payload?.challengeId,
      delivery: payload?.delivery,
      maskedEmail: payload?.maskedEmail,
      maskedPhone: payload?.maskedPhone,
      resendAfter: payload?.resendAfter,
      devCode: payload?.devCode,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
