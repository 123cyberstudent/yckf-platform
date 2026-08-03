'use client'

import Link from 'next/link'
import { Eye, EyeOff, MailCheck, Sparkles, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function SignUpPage() {
  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)

  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Submission state
  const [submitted, setSubmitted] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Signup promo banner
  const [promo, setPromo] = useState<{ show: boolean; title?: string; message?: string }>({ show: false })
  const [promoDismissed, setPromoDismissed] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/promotions/eligible?placement=signup&platform=WEB')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        if (data.show && data.promo) {
          setPromo({ show: true, title: data.promo.title, message: data.promo.message })
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 1. Basic frontend validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreed) {
      setError('You must agree to the Terms & Conditions.')
      return
    }

    setIsLoading(true)

    try {
      // 2. Send the data to your Next.js API route
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName: fullName, 
          email: email, 
          password: password 
        }),
      })

      const data = await response.json()

      // 3. Check if the backend actually succeeded
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Registration failed. Please try again.')
      }

      // 4. Only show the success message if the API worked
      setSubmitted(true)
      setConfirmationSent(data.confirmationSent !== false)
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">Join the YCKF Community</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Create an account </h1>
            <p className="text-base text-muted-foreground">Sign up to access exclusive features and stay connected with the YCKF community.</p>
          </div>

          {promo.show && !promoDismissed && (
            <div className="flex items-start justify-between gap-3 rounded-3xl border border-[#2563EB]/30 bg-gradient-to-r from-[#2563EB]/10 to-emerald-500/10 px-5 py-4 text-left">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10">
                  <Sparkles className="size-4 text-[#2563EB]" />
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">{promo.title}</p>
                  {promo.message && <p className="mt-0.5 text-sm text-muted-foreground">{promo.message}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPromoDismissed(true)}
                className="shrink-0 text-muted-foreground transition hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleSubmit} className="mt-8 grid gap-4" autoComplete="off">
              {error && (
                <div className="rounded-3xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-base text-red-500 text-center">
                  {error}
                </div>
              )}
              
              {/* Hidden dummy fields to prevent browser autofill */}
              <input type="text" name="fake-username" autoComplete="username" className="hidden" tabIndex={-1} />
              <input type="password" name="fake-password" autoComplete="new-password" className="hidden" tabIndex={-1} />
              
              <input 
                className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none" 
                type="text" 
                placeholder="Full Name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required 
              />
              <input 
                className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none" 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required 
              />
              <div className="relative">
                <input 
                  className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 pr-12 text-base text-foreground outline-none" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 pr-12 text-base text-foreground outline-none" 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="off"
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
              <label className="flex items-center gap-3 text-base text-muted-foreground">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required 
                />
                I agree to the Terms & Conditions
              </label>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
              <p className="text-center text-base text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:text-primary/80">
                  Login
                </Link>
              </p>
            </form>
          ) : (
            <div className="rounded-3xl border border-border/70 bg-background/80 p-8 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
                <MailCheck className="size-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Thank you for signing up.
              </h2>
              {confirmationSent ? (
                <p className="mt-3 text-base leading-8 text-muted-foreground">
                  We have sent a confirmation link to your email address. Please check
                  your inbox (including spam) to activate your account.
                </p>
              ) : (
                <p className="mx-auto mt-3 max-w-md rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-base leading-7 text-amber-600">
                  Your account was created, but we could not send the confirmation email
                  right now. Please try again shortly or contact support.
                </p>
              )}
              <Link href="/login" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90">
                Go to Login
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}