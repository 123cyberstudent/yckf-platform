import { NextRequest, NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await backendFetch('/api/auth/staff/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Failed to submit request' },
        { status: response.status }
      )
    }

    return NextResponse.json(
      {
        success: true,
        requestNumber: payload?.requestNumber || null,
        message: payload?.message || 'Your request has been submitted for review.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Staff password reset request error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
