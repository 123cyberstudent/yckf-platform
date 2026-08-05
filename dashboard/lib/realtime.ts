'use client'

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

let socketCache: Socket | null = null

function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://localhost:4001'
  ).replace(/\/$/, '')
}

export async function getSocket(): Promise<Socket | null> {
  if (socketCache?.connected) return socketCache

  try {
    const tokenRes = await fetch('/api/realtime/token')
    if (!tokenRes.ok) return null
    const { token } = await tokenRes.json()
    if (!token) return null

    const socket = io(getBackendBaseUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    })
    socketCache = socket
    return socket
  } catch {
    return null
  }
}

export function useRealtimeEvents(events: Record<string, (payload: unknown) => void>, deps: unknown[] = []) {
  const eventRef = useRef(events)

  useEffect(() => {
    eventRef.current = events
  }, [events])

  useEffect(() => {
    let disposed = false
    let socket: Socket | null = null

    const connect = async () => {
      if (disposed) return
      socket = await getSocket()
      if (!socket || disposed) return

      Object.keys(eventRef.current).forEach((event) => {
        socket?.on(event, (payload: unknown) => {
          try {
            eventRef.current[event]?.(payload)
          } catch {
            // listener errors are non-fatal
          }
        })
      })

      socket.on('connect_error', () => {
        // token may have expired; reconnect in background
        setTimeout(connect, 5000)
      })
    }

    connect()

    return () => {
      disposed = true
      Object.keys(eventRef.current).forEach((event) => socket?.off(event))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
