'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Eye, EyeOff, Loader2, AlertTriangle, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const prefilledEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(prefilledEmail)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Please enter the 6-digit reset code from your email.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (!/(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(newPassword)) {
      setError('Password must contain at least one number and one special character.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setStatus('sending')
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Password reset failed. Please try again.')
        setStatus('error')
        return
      }

      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-md space-y-8">
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
              <KeyRound className="size-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Password reset successful</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Your password has been changed. You can now sign in with your new password.
            </p>
            <Link href="/login" className="mt-6 inline-flex w-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90">
              Go to Login
            </Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-md space-y-8">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Create New Password</p>
          <h1 className="text-3xl font-semibold text-foreground">Reset your account password.</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Enter the 6-digit code we emailed you, then choose a strong new password.
          </p>
        </section>
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
          <input
            className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm tracking-widest text-foreground outline-none"
            type="text"
            inputMode="numeric"
            placeholder="6-digit reset code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
          <div className="relative">
            <input
              className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 pr-12 text-sm text-foreground outline-none"
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 pr-12 text-sm text-foreground outline-none"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={status === 'sending'}>
            {status === 'sending' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Back to{' '}
            <Link href="/login" className="text-primary hover:text-primary/80">
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
