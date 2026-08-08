import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEFAULT_BACKEND_URL = 'http://localhost:4001'
const BACKEND_FETCH_TIMEOUT_MS = 30000
const BACKEND_FETCH_RETRIES = 2

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

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
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export async function clearBackendRefreshCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(REFRESH_COOKIE_NAME)
}

export async function backendFetch(
  path: string,
  init: RequestInit = {},
  authToken?: string | null,
  options: { autoRefresh?: boolean } = {}
) {
  const headers = new Headers(init.headers)

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const doFetch = () =>
    fetchWithTimeout(getBackendUrl(path), { ...init, headers }, BACKEND_FETCH_TIMEOUT_MS)

  let response: Response | null = null
  try {
    response = await doFetch()
  } catch (err) {
    // Cold/slow backend or a dropped connection: retry a few times before
    // surfacing a network error to the client.
    let lastErr = err
    for (let attempt = 1; attempt <= BACKEND_FETCH_RETRIES; attempt++) {
      try {
        response = await doFetch()
        break
      } catch (retryErr) {
        lastErr = retryErr
      }
    }
    if (!response) {
      throw lastErr
    }
    console.warn(`[backendFetch] retried ${path} after network failure`)
  }

  if (options.autoRefresh && response.status === 401 && authToken) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      const retryHeaders = new Headers(init.headers)
      retryHeaders.set('Authorization', `Bearer ${newToken}`)

      if (init.body && typeof init.body === 'string' && !retryHeaders.has('Content-Type')) {
        retryHeaders.set('Content-Type', 'application/json')
      }

      return fetch(getBackendUrl(path), {
        ...init,
        headers: retryHeaders,
      })
    }
  }

  return response
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getBackendRefreshToken()
  if (!refreshToken) return null

  let response: Response
  try {
    response = await backendFetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return null
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      await clearBackendAuthCookie()
      await clearBackendRefreshCookie()
    }
    return null
  }

  if (!payload?.accessToken) return null

  await setBackendAuthCookie(payload.accessToken)
  if (payload.refreshToken) {
    await setBackendRefreshCookie(payload.refreshToken)
  }
  return payload.accessToken
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
