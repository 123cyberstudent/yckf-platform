import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

interface BackendMember {
  id?: number | string
  _id?: number | string
  name?: string
  role?: string
  title?: string
  bio?: string
  email?: string
  linkedin?: string
  linkedinUrl?: string
  twitter?: string
  twitterUrl?: string
  imageUrl?: string
  image?: string
  avatar?: string
  sortOrder?: number
  isActive?: boolean
  createdAt?: string
  created_at?: string
}

export async function GET() {
  try {
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json([], { status: 401 })
    }

    const response = await backendFetch('/api/members/all', { method: 'GET' }, token)

    if (response.status === 401) {
      const { clearBackendAuthCookie } = await import('@/lib/backend')
      await clearBackendAuthCookie()
      return NextResponse.json([], { status: 401 })
    }

    if (!response.ok) {
      return NextResponse.json([], { status: response.status })
    }

    const payload = await response.json().catch(() => null)
    if (!payload) return NextResponse.json([])

    const memberList = Array.isArray(payload) ? payload : payload.members || payload.data || []

    const transformed = memberList.map((m: BackendMember) => ({
      id: m.id || m._id,
      name: m.name,
      role: m.role || m.title,
      bio: m.bio || '',
      email: m.email || '',
      linkedin: m.linkedin || m.linkedinUrl || '',
      twitter: m.twitter || m.twitterUrl || '',
      imageUrl: m.imageUrl || m.image || m.avatar || '',
      sortOrder: m.sortOrder ?? 0,
      isActive: m.isActive !== false,
      createdAt: m.createdAt || m.created_at || new Date().toISOString(),
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Members GET error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = await getBackendAuthToken()

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await backendFetch('/api/members', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json({ error: err.error || 'Failed to create member' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Members POST error:', error)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}
