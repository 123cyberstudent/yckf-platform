import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Send the data to backend
    const response = await backendFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('Backend registration failed:', payload)
      return NextResponse.json(
        { success: false, error: payload?.error || 'Registration failed' },
        { status: response.status }
      )
    }

    // Registration successful
    return NextResponse.json({
      success: true,
      message: payload?.message || 'User registered. Please check your email.',
      confirmationSent: payload?.confirmationSent !== false,
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}