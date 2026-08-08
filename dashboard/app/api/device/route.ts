import { NextResponse } from 'next/server'
import { backendFetch, getBackendAuthToken } from '@/lib/backend'

export interface RawBackendDevice {
  id: number | string
  internalDeviceId?: string | null
  deviceName?: string | null
  platform?: string | null
  deviceModel?: string | null
  osVersion?: string | null
  appVersion?: string | null
  status?: string | null
  protectionEnabled?: boolean | null
  stealMode?: string | null
  riskScore?: number | null
  lastSeenAt?: string | null
  lastLatitude?: number | null
  lastLongitude?: number | null
  lastAddress?: string | null
  markedStolenAt?: string | null
  recoveredAt?: string | null
  createdAt?: string | null
  owner?: {
    id: number
    email: string
    fullName: string | null
    phone: string | null
  } | null
  [key: string]: unknown
}

export async function GET(request: Request) {
  try {
    const token = await getBackendAuthToken()
    const url = new URL(request.url)
    const qs = new URLSearchParams()
    if (url.searchParams.get('status')) qs.set('status', url.searchParams.get('status')!)
    if (url.searchParams.get('search')) qs.set('search', url.searchParams.get('search')!)
    qs.set('page', url.searchParams.get('page') || '1')
    qs.set('limit', url.searchParams.get('limit') || '50')

    const response = await backendFetch(`/api/device?${qs.toString()}`, { method: 'GET' }, token, { autoRefresh: true })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Unable to load devices' },
        { status: response.status }
      )
    }

    const devices = Array.isArray(payload?.devices) ? (payload.devices as RawBackendDevice[]) : []
    const mapped = devices.map((d) => ({
      id: d.id?.toString() ?? 'unknown',
      internalDeviceId: d.internalDeviceId ?? '',
      deviceName: d.deviceName ?? d.internalDeviceId ?? 'Unnamed device',
      platform: d.platform ?? 'ANDROID',
      deviceModel: d.deviceModel ?? null,
      osVersion: d.osVersion ?? null,
      appVersion: d.appVersion ?? null,
      status: d.status ?? 'ACTIVE',
      protectionEnabled: d.protectionEnabled ?? true,
      stealMode: d.stealMode ?? 'silent',
      riskScore: d.riskScore ?? 0,
      lastSeenAt: d.lastSeenAt ?? null,
      lastLatitude: d.lastLatitude ?? null,
      lastLongitude: d.lastLongitude ?? null,
      lastAddress: d.lastAddress ?? null,
      markedStolenAt: d.markedStolenAt ?? null,
      recoveredAt: d.recoveredAt ?? null,
      createdAt: d.createdAt ?? null,
      owner: d.owner ?? null,
    }))

    return NextResponse.json({ devices: mapped, total: payload?.total ?? mapped.length })
  } catch (error) {
    console.error('Devices list route error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to load devices' },
      { status: 500 }
    )
  }
}