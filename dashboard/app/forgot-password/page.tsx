import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-md space-y-8">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Reset Your Password</p>
          <h1 className="text-3xl font-semibold text-white">Forgot your password?</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Enter your email address and we will send you a link to reset your password.
          </p>
        </section>
        <form className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 space-y-4">
          <input className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="email" placeholder="Email Address" required />
          <Button type="submit" className="w-full">Send Reset Link</Button>
          <p className="text-center text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80">Back to Login</Link>
          </p>
        </form>
      </div>
    </main>
  )
}
