// Logout API Route
import { NextResponse } from 'next/server'
import { clearBackendAuthCookie, getBackendRefreshToken, clearBackendRefreshCookie, backendFetch } from '@/lib/backend'

export async function POST() {
  try {
    const refreshToken = await getBackendRefreshToken()
    if (refreshToken) {
      await backendFetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    }

    await clearBackendAuthCookie()
    await clearBackendRefreshCookie()

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}
