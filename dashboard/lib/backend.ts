import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEFAULT_BACKEND_URL = 'http://localhost:4001'

export function getBackendBaseUrl() {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL
}

export function getBackendUrl(path: string) {
  const baseUrl = getBackendBaseUrl().replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

export async function getBackendAuthToken() {
  const cookieStore = await cookies()
  return cookieStore.get('yckf-auth-token')?.value ?? null
}

export async function setBackendAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('yckf-auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
}

export async function clearBackendAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('yckf-auth-token')
}

const REFRESH_COOKIE_NAME = 'yckf-refresh-token'

export async function getBackendRefreshToken() {
  const cookieStore = await cookies()
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null
}

export async function setBackendRefreshCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function clearBackendRefreshCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(REFRESH_COOKIE_NAME)
}

export async function backendFetch(path: string, init: RequestInit = {}, authToken?: string | null) {
  const headers = new Headers(init.headers)

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(getBackendUrl(path), {
    ...init,
    headers,
  })
}

export function normalizeRole(role?: string) {
  if (!role) return 'user'
  const normalized = role.toLowerCase()
  if (normalized === 'admin') return 'admin'
  if (normalized === 'investigator') return 'investigator'
  if (normalized === 'volunteer') return 'volunteer'
  return 'user'
}

export function normalizeStatus(status?: string) {
  if (!status) return 'active'
  const normalized = status.toLowerCase()
  if (normalized === 'active' || normalized === 'inactive' || normalized === 'suspended') {
    return normalized
  }
  return 'active'
}

export function toIsoString(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export function formatResponseTimeSeconds(seconds?: number | null) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '0.0 hrs'
  const hours = seconds / 3600
  return `${hours.toFixed(1)} hrs`
}

export function mockResponse<T>(data: T, reason: string = 'Backend unreachable') {
  const response = NextResponse.json(data)
  response.headers.set('X-Mock-Data', 'true')
  response.headers.set('X-Mock-Reason', reason)
  return response
}
