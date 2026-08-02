'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MailCheck, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!token) {
        setStatus('error')
        setMessage('Missing confirmation token.')
        return
      }

      try {
        const response = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`
        )
        const data = await response.json()

        if (cancelled) return

        if (data.success) {
          setStatus('success')
          setMessage(data.message || 'Email verified successfully.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Invalid or expired confirmation link.')
        }
      } catch {
        if (cancelled) return
        setStatus('error')
        setMessage('Something went wrong while verifying your email. Please try again.')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-lg shadow-black/5">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-base text-muted-foreground">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
              <MailCheck className="size-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Email verified!</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{message}</p>
            <Link href="/login" className="mt-6 w-full">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-500/10 ring-2 ring-red-500/20">
              <XCircle className="size-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Verification failed</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{message}</p>
            <div className="mt-6 w-full space-y-3">
              <Link href="/login" className="block">
                <Button className="w-full">Go to Login</Button>
              </Link>
              <Link
                href="/signup"
                className="block text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Create a new account
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-10 animate-spin text-primary" />
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
