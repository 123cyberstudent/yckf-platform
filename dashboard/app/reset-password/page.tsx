'use client'

import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-md space-y-8">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Create New Password</p>
          <h1 className="text-3xl font-semibold text-white">Reset your account password.</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Choose a strong new password to secure your account and continue using YCKF services.
          </p>
        </section>
        <form className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 space-y-4">
          <div className="relative">
            <input className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 pr-12 text-sm text-foreground outline-none" type={showPassword ? 'text' : 'password'} placeholder="New Password" required />
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
            <input className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 pr-12 text-sm text-foreground outline-none" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm New Password" required />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button type="submit" className="w-full">Reset Password</Button>
          <p className="text-center text-sm text-muted-foreground">
            Back to{' '}
            <Link href="/login" className="text-primary hover:text-primary/80">Login</Link>
          </p>
        </form>
      </div>
    </main>
  )
}
