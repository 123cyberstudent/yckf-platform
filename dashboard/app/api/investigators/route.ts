import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken, normalizeRole, normalizeStatus, toIsoString } from '@/lib/backend'

export async function GET() {
  try {
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json([], { status: 401 })
    }

    const response = await backendFetch('/api/investigators', { method: 'GET' }, token)

    if (response.status === 401) {
      const { clearBackendAuthCookie } = await import('@/lib/backend')
      await clearBackendAuthCookie()
      return NextResponse.json([], { status: 401 })
    }

    if (!response.ok) {
      return NextResponse.json([], { status: response.status })
    }

    const payload = await response.json().catch(() => null)

    if (!payload) {
      return NextResponse.json([])
    }

    const items = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.investigators) ? payload.investigators : [])

    return NextResponse.json(items.map((user: any) => ({
      id: user.id?.toString() ?? `inv-${Date.now()}-${Math.random()}`,
      email: user.email ?? '',
      name: user.fullName ?? user.name ?? 'Unknown',
      role: normalizeRole(user.role),
      status: normalizeStatus(user.isActive !== false ? 'active' : 'inactive'),
      createdAt: toIsoString(user.createdAt) ?? new Date().toISOString(),
      lastLogin: toIsoString(user.lastLogin) ?? null,
    })))
  } catch (error) {
    console.error('Investigators route error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await backendFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, role: body.role || 'VOLUNTEER' }),
    }, token)

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json({ error: data.error || 'Failed to create volunteer' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Create volunteer error:', error)
    return NextResponse.json({ error: 'Failed to create volunteer' }, { status: 500 })
  }
}
