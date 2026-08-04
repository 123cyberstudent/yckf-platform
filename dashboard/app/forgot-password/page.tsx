'use client'

import Link from 'next/link'
import { Loader2, MailCheck, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [delivered, setDelivered] = useState(true)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setStatus('sending')
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Password reset request failed. Please try again.')
        setStatus('error')
        return
      }

      setDelivered(data.delivered !== false)
      setStatus('sent')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-md space-y-8">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Reset Your Password</p>
          <h1 className="text-3xl font-semibold text-foreground">Forgot your password?</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Enter your email address and we will send you a code to reset your password.
          </p>
        </section>

        {status === 'sent' ? (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
              <MailCheck className="size-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
            {delivered ? (
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                We sent a password reset code to{' '}
                <span className="font-semibold text-foreground">{email}</span>. It expires in
                15 minutes. If you don&apos;t see it, check your spam folder.
              </p>
            ) : (
              <p className="mt-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-600">
                We could not send the reset code right now. You can still continue below and
                enter a code if you received one another way, or try again shortly.
              </p>
            )}
            <Link
              href={`/reset-password?email=${encodeURIComponent(email)}`}
              className="mt-6 inline-flex w-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Continue to reset password
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Remembered your password?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80">
                Back to Login
              </Link>
            </p>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 space-y-4"
          >
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                <AlertTriangle className="size-4 shrink-0" />
                {error}
              </div>
            )}
            <input
              className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Button type="submit" className="w-full" disabled={status === 'sending'}>
              {status === 'sending' ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Sending...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80">
                Back to Login
              </Link>
            </p>
            <p className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-center text-sm leading-6 text-muted-foreground">
              Staff member and don&apos;t remember your account email?{' '}
              <Link href="/staff-password-request" className="font-medium text-primary hover:text-primary/80">
                Request a password reset from the Super Admin
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
