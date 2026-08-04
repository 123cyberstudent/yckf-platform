'use client'

import Link from 'next/link'
import { Loader2, MailCheck, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const ROLE_OPTIONS = [
  { value: '', label: 'Select your staff role (optional)' },
  { value: 'Volunteer / Investigator', label: 'Volunteer / Investigator' },
  { value: 'Secondary Admin', label: 'Secondary Admin' },
]

export default function StaffPasswordRequestPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    reason: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [requestNumber, setRequestNumber] = useState('')
  const [error, setError] = useState('')

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError('Please enter a valid email address, or leave it blank if you forgot it.')
      return
    }

    setStatus('sending')
    try {
      const response = await fetch('/api/auth/staff/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          role: form.role || undefined,
          reason: form.reason.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to submit your request. Please try again.')
        setStatus('error')
        return
      }

      setRequestNumber(data.requestNumber || '')
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
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Staff Password Reset</p>
          <h1 className="text-3xl font-semibold text-foreground">Forgot your email or password?</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            If you are a Volunteer, Investigator or Secondary Admin and can&apos;t remember your account
            email or password, submit a short request and the Super Admin will approve it and send you a
            reset link or a temporary password.
          </p>
        </section>

        {status === 'sent' ? (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
              <MailCheck className="size-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Request submitted</h2>
            {requestNumber && (
              <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Reference number</p>
                <p className="mt-1 text-lg font-bold tracking-wider text-primary">{requestNumber}</p>
              </div>
            )}
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Your request has been forwarded to the Super Admin for review. Once approved, a secure
              reset link or a temporary password will be sent to your registered email. Please watch
              your inbox (including spam) and check your phone.
            </p>
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
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-foreground">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                type="text"
                placeholder="e.g. Kwame Mensah"
                value={form.fullName}
                onChange={handleChange('fullName')}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email Address{' '}
                <span className="text-muted-foreground">(if you remember it)</span>
              </label>
              <input
                id="email"
                className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange('email')}
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
                Phone Number <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="phone"
                className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                type="tel"
                placeholder="+233 55 000 0000"
                value={form.phone}
                onChange={handleChange('phone')}
                autoComplete="tel"
              />
            </div>
            <div>
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-foreground">
                Role <span className="text-muted-foreground">(optional)</span>
              </label>
              <select
                id="role"
                className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                value={form.role}
                onChange={handleChange('role')}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-foreground">
                Message <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="reason"
                className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                rows={3}
                placeholder="Anything that will help the Super Admin verify your account"
                value={form.reason}
                onChange={handleChange('reason')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={status === 'sending'}>
              {status === 'sending' ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80">
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
