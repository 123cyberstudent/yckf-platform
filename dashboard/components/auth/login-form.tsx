'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Shield,
  ShieldCheck,
  Users,
  User,
  ArrowLeft,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronRight,
  Fingerprint,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field'

type Role = 'super_admin' | 'admin' | 'volunteer' | 'user'

interface RoleCard {
  id: Role
  title: string
  subtitle: string
  description: string
  icon: typeof Shield
  color: string
  borderColor: string
  iconBg: string
  iconRing: string
}

const roles: RoleCard[] = [
  {
    id: 'super_admin',
    title: 'Super Admin',
    subtitle: 'Super Admin Dashboard',
    description: 'Full access to all management features including users & volunteers',
    icon: ShieldCheck,
    color: 'text-[#7C3AED]',
    borderColor: 'border-l-[#7C3AED]',
    iconBg: 'bg-[#7C3AED]/10',
    iconRing: 'ring-[#7C3AED]/20',
  },
  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'Admin Dashboard',
    description: 'Secondary admins with access excluding user & volunteer management',
    icon: Shield,
    color: 'text-[#2563EB]',
    borderColor: 'border-l-[#2563EB]',
    iconBg: 'bg-[#2563EB]/10',
    iconRing: 'ring-[#2563EB]/20',
  },
  {
    id: 'volunteer',
    title: 'Volunteer / Investigator',
    subtitle: 'Volunteer Portal',
    description: 'Handle cases, evidence & investigations',
    icon: Users,
    color: 'text-[#2DD4BF]',
    borderColor: 'border-l-[#2DD4BF]',
    iconBg: 'bg-[#2DD4BF]/10',
    iconRing: 'ring-[#2DD4BF]/20',
  },
  {
    id: 'user',
    title: 'User',
    subtitle: 'User Portal',
    description: 'Report incidents, track cases & access courses',
    icon: User,
    color: 'text-foreground',
    borderColor: 'border-l-muted-foreground',
    iconBg: 'bg-muted/50',
    iconRing: 'ring-muted-foreground/20',
  },
]

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

function BrandingPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#06292D] via-[#0A3A3F] to-[#0D2E32] md:flex md:flex-col md:items-center md:justify-center">
      {/* Decorative floating dots */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[20%] size-2 rounded-full bg-[#2DD4BF]/20" style={{ animation: 'float 4s ease-in-out infinite' }} />
        <div className="absolute left-[70%] top-[15%] size-3 rounded-full bg-[#2DD4BF]/15" style={{ animation: 'float 5s ease-in-out infinite 0.5s' }} />
        <div className="absolute left-[25%] top-[65%] size-1.5 rounded-full bg-[#2DD4BF]/25" style={{ animation: 'float 6s ease-in-out infinite 1s' }} />
        <div className="absolute left-[80%] top-[55%] size-4 rounded-full bg-[#2DD4BF]/10" style={{ animation: 'float 4.5s ease-in-out infinite 1.5s' }} />
        <div className="absolute left-[50%] top-[80%] size-2 rounded-full bg-[#2DD4BF]/20" style={{ animation: 'float 5.5s ease-in-out infinite 2s' }} />
        <div className="absolute left-[10%] top-[40%] size-3 rounded-full bg-[#2DD4BF]/10" style={{ animation: 'float 7s ease-in-out infinite 0.8s' }} />
        <div className="absolute left-[60%] top-[35%] size-1.5 rounded-full bg-[#2DD4BF]/30" style={{ animation: 'float 3.5s ease-in-out infinite 1.2s' }} />
        <div className="absolute left-[40%] top-[10%] size-2.5 rounded-full bg-[#2DD4BF]/15" style={{ animation: 'float 6s ease-in-out infinite 0.3s' }} />
        <div className="absolute left-[85%] top-[75%] size-2 rounded-full bg-[#2DD4BF]/20" style={{ animation: 'float 4s ease-in-out infinite 2.5s' }} />
        <div className="absolute left-[5%] top-[85%] size-3 rounded-full bg-[#2DD4BF]/10" style={{ animation: 'float 5s ease-in-out infinite 1.8s' }} />
        {/* Large decorative circle */}
        <div className="absolute -left-20 -top-20 size-64 rounded-full bg-[#2DD4BF]/5" />
        <div className="absolute -bottom-32 -right-32 size-80 rounded-full bg-[#2DD4BF]/5" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        {/* Shield logo with pulse ring */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-[#2DD4BF]/10" style={{ animation: 'pulse-ring 3s ease-out infinite' }} />
          <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-[#2DD4BF]/20 to-[#2DD4BF]/5 ring-2 ring-[#2DD4BF]/30">
            <Shield className="size-12 text-[#2DD4BF]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Brand text */}
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-white">
          YCKF
        </h1>
        <p className="mb-1 text-base font-semibold uppercase tracking-[0.2em] text-[#2DD4BF]/80">
          Young Cyber Knights Foundation
        </p>
        <div className="my-6 h-px w-24 bg-gradient-to-r from-transparent via-[#2DD4BF]/40 to-transparent" />
        <p className="max-w-xs text-xl leading-relaxed text-white/60">
          Empowering a Safer Digital World
        </p>

        {/* Feature pills */}
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#2DD4BF]/10 bg-[#2DD4BF]/5 px-4 py-2">
            <Fingerprint className="size-3.5 text-[#2DD4BF]/70" />
            <span className="text-base text-white/50">Secure Access Portal</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#2DD4BF]/10 bg-[#2DD4BF]/5 px-4 py-2">
            <Shield className="size-3.5 text-[#2DD4BF]/70" />
            <span className="text-base text-white/50">Encrypted Authentication</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-center text-base text-white/25">
        &copy; {new Date().getFullYear()} Young Cyber Knights Foundation
      </p>
    </div>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const activeRole = roles.find((r) => r.id === selectedRole)

  function handleBack() {
    setSelectedRole(null)
    setError(null)
    reset()
    setShowPassword(false)
  }

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Login failed')
        return
      }

      const actualRole = result.data?.role || result.role || '';
      const isStaff = ['SUPER_ADMIN', 'ADMIN', 'VOLUNTEER'].includes(actualRole);
      router.push(isStaff ? '/dashboard' : '/')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>

      <div className="flex min-h-screen bg-background">
        {/* Left branding panel */}
        <BrandingPanel />

        {/* Right form panel */}
        <div className="flex flex-1 flex-col">
          {/* Mobile header */}
          <div className="flex items-center gap-3 border-b border-border/50 bg-gradient-to-r from-[#06292D] to-[#0D2E32] px-6 py-4 md:hidden">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#2DD4BF]/15 ring-1 ring-[#2DD4BF]/25">
              <Shield className="size-4.5 text-[#2DD4BF]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">YCKF Portal</h1>
              <p className="text-sm text-white/40">Young Cyber Knights Foundation</p>
            </div>
          </div>

          {/* Form area */}
          <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8">
            <div className="w-full max-w-md">
              {/* Back to home link */}
              <Link
                href="/"
                className="mb-6 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Back to Home
              </Link>

              {/* Role Selection */}
              {!selectedRole && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                      Welcome back
                    </h2>
                    <p className="mt-1 text-lg text-muted-foreground">
                      Select your role to sign in
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {roles.map((role, index) => {
                      const Icon = role.icon
                      return (
                        <button
                          key={role.id}
                          onClick={() => setSelectedRole(role.id)}
                          className={`group flex items-center gap-4 rounded-xl border border-l-4 border-border/50 border-l-transparent bg-card/80 p-5 text-left backdrop-blur transition-all duration-200 hover:border-l-current ${role.borderColor} hover:shadow-lg hover:shadow-black/5 hover:shadow-[#2DD4BF]/5 hover:backdrop-blur-md active:scale-[0.98]`}
                          style={{
                            animation: `fadeIn 0.4s ease-out ${index * 0.1}s both`,
                          }}
                        >
                          <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${role.iconBg} ring-2 ${role.iconRing} transition-all duration-200 group-hover:scale-105`}>
                            <Icon className={`size-5 ${role.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <h3 className="text-xl font-bold text-foreground">
                                {role.title}
                              </h3>
                              <span className="text-base text-muted-foreground">
                                {role.subtitle}
                              </span>
                            </div>
                            <p className="mt-0.5 text-base text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5 pt-4 text-center">
                    <Link
                      href="/volunteers"
                      className="text-lg font-semibold text-[#2563EB] underline-offset-4 transition-colors hover:underline hover:text-[#2563EB]/80"
                    >
                      New Volunteer? Request Access
                    </Link>
                  </div>
                </div>
              )}

              {/* Login Form */}
              {selectedRole && activeRole && (
                <div style={{ animation: 'slideInRight 0.35s ease-out' }}>
                  <button
                    onClick={handleBack}
                    className="mb-4 flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" />
                    Back to role selection
                  </button>

                  <Card className="border-border/50 bg-card shadow-xl shadow-black/[0.03]">
                    <CardContent className="pt-6">
                      {/* Role icon and heading */}
                      <div className="mb-6 flex flex-col items-center text-center">
                        <div className={`mb-3 flex size-14 items-center justify-center rounded-2xl ${activeRole.iconBg} ring-2 ${activeRole.iconRing}`}>
                          <activeRole.icon className={`size-7 ${activeRole.color}`} />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                          {activeRole.subtitle}
                        </h2>
                        <p className="mt-0.5 text-base text-muted-foreground">
                          Sign in to your {activeRole.title.toLowerCase()} account
                        </p>
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                        <input type="text" name="fake_username" autoComplete="username" className="hidden" tabIndex={-1} />
                        <input type="password" name="fake_password" autoComplete="new-password" className="hidden" tabIndex={-1} />
                        {error && (
                          <Alert variant="destructive">
                            <AlertCircle className="size-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}

                        <FieldGroup>
                          <Field data-invalid={!!errors.email}>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="off"
                                aria-invalid={!!errors.email}
                                className="pl-9"
                                {...register('email')}
                              />
                            </div>
                            {errors.email && (
                              <FieldDescription className="text-destructive">
                                {errors.email.message}
                              </FieldDescription>
                            )}
                          </Field>

                          <Field data-invalid={!!errors.password}>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                autoComplete="new-password"
                                aria-invalid={!!errors.password}
                                className="pl-9 pr-10"
                                {...register('password')}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                {showPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </button>
                            </div>
                            {errors.password && (
                              <FieldDescription className="text-destructive">
                                {errors.password.message}
                              </FieldDescription>
                            )}
                          </Field>
                        </FieldGroup>

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] font-medium shadow-lg shadow-[#2563EB]/25 transition-all duration-200 hover:from-[#2563EB]/90 hover:to-[#3B82F6]/90 hover:shadow-xl hover:shadow-[#2563EB]/30"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Signing in...
                            </span>
                          ) : (
                            'Sign in'
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Footer */}
              <p className="mt-8 text-center text-sm text-muted-foreground/60">
                Young Cyber Knights Foundation &mdash; Empowering a Safer Digital World
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
