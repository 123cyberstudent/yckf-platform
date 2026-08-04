'use client'

import { useState, useEffect } from 'react'
import { resetCachedRole } from '@/lib/permissions'
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
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Fingerprint,
  KeyRound,
  RefreshCw,
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

const managementRoles = roles.filter((role) => role.id !== 'user')

const MGMT_LOCK_THRESHOLD = 5
const MGMT_LOCK_SECONDS = 60

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Please enter your email or phone number'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface QuickLoginAccount {
  role: Role
  label: string
  description: string
  identifier: string
  password: string
}

const quickLoginAccounts: QuickLoginAccount[] = [
  {
    role: 'super_admin',
    label: 'Super Admin',
    description: 'mypracticalworks@gmail.com',
    identifier: 'mypracticalworks@gmail.com',
    password: 'SecureSuperAdmin@2026',
  },
  {
    role: 'admin',
    label: 'Admin',
    description: 'secondaryadmin@yckf.org',
    identifier: 'secondaryadmin@yckf.org',
    password: 'SecureSecondaryAdmin@2026',
  },
  {
    role: 'user',
    label: 'User',
    description: 'user@yckf.org',
    identifier: 'user@yckf.org',
    password: 'SecureUser@2026',
  },
]

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
        {/* Company logo with pulse ring */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-[#2DD4BF]/10" style={{ animation: 'pulse-ring 3s ease-out infinite' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/companylogo.png"
            alt="YCKF Logo"
            className="relative size-24 rounded-full object-cover shadow-lg ring-2 ring-[#2DD4BF]/30"
          />
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
  const [mgmtStage, setMgmtStage] = useState<'idle' | 'warning' | 'code' | 'menu'>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Management gate (staff access code + auto-lockout) states
  const [staffCode, setStaffCode] = useState('')
  const [isStaffCodeLoading, setIsStaffCodeLoading] = useState(false)
  const [staffCodeError, setStaffCodeError] = useState<string | null>(null)
  const [mgmtFailures, setMgmtFailures] = useState(0)
  const [mgmtLockUntil, setMgmtLockUntil] = useState<number | null>(null)
  const [mgmtLockRemaining, setMgmtLockRemaining] = useState(0)

  // OTP (verification code) states
  const [otpState, setOtpState] = useState<{
    challengeId: number
    maskedEmail?: string
    maskedPhone?: string | null
    message?: string
    resendAfter?: number
  } | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [isOtpLoading, setIsOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(
      () => setResendIn((s) => (s <= 1 ? 0 : s - 1)),
      1000
    )
    return () => clearInterval(timer)
  }, [resendIn])

  useEffect(() => {
    if (!mgmtLockUntil) return
    const update = () => {
      const remaining = Math.ceil((mgmtLockUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setMgmtLockUntil(null)
        setMgmtLockRemaining(0)
      } else {
        setMgmtLockRemaining(remaining)
      }
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [mgmtLockUntil])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
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

  function openRoleForm(role: Role) {
    setSelectedRole(role)
    setMgmtStage('idle')
    setError(null)
    reset()
    setShowPassword(false)
  }

  function handleQuickLogin(role: Role, identifier: string, password: string) {
    setSelectedRole(role)
    setOtpState(null)
    setOtpCode('')
    setOtpError(null)
    setError(null)
    reset({ identifier, password })
    setShowPassword(false)
  }

  function isManagementRole(role: Role | null) {
    return role === 'super_admin' || role === 'admin' || role === 'volunteer'
  }

  function recordMgmtFailure() {
    setMgmtFailures((f) => {
      const next = f + 1
      if (next >= MGMT_LOCK_THRESHOLD) {
        setMgmtLockUntil(Date.now() + MGMT_LOCK_SECONDS * 1000)
        setMgmtStage('idle')
        setStaffCode('')
        setStaffCodeError(null)
        return 0
      }
      return next
    })
  }

  async function handleStaffContinue() {
    setStaffCodeError(null)
    try {
      const response = await fetch('/api/auth/staff/status')
      const result = await response.json()
      setMgmtStage(result.enabled ? 'code' : 'menu')
    } catch {
      setMgmtStage('code')
    }
  }

  async function handleStaffCodeVerify() {
    if (!staffCode.trim()) {
      setStaffCodeError('Please enter your staff access code')
      return
    }
    setIsStaffCodeLoading(true)
    setStaffCodeError(null)
    try {
      const response = await fetch('/api/auth/staff/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: staffCode.trim() }),
      })

      const result = await response.json()

      if (!result.success) {
        setStaffCodeError(result.error || 'Verification failed')
        return
      }

      if (result.valid) {
        setMgmtStage('menu')
        setStaffCode('')
        return
      }

      setStaffCodeError('Incorrect staff access code.')
      recordMgmtFailure()
    } catch {
      setStaffCodeError('An unexpected error occurred. Please try again.')
    } finally {
      setIsStaffCodeLoading(false)
    }
  }

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: data.identifier, password: data.password }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Login failed')
        if (isManagementRole(selectedRole)) recordMgmtFailure()
        return
      }

      if (result.requiresOtp && result.challengeId) {
        setOtpState({
          challengeId: result.challengeId,
          maskedEmail: result.maskedEmail,
          maskedPhone: result.maskedPhone,
          message: result.message,
          resendAfter: result.resendAfter,
        })
        setOtpCode('')
        setOtpError(null)
        setResendIn(result.resendAfter || 60)
        return
      }

      const actualRole = result.data?.role || result.role || '';
      const isStaff = ['SUPER_ADMIN', 'ADMIN', 'VOLUNTEER'].includes(actualRole);
      resetCachedRole();
      router.push(isStaff ? '/dashboard' : '/dashboard/user-portal')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpState) return
    if (!otpCode.trim()) {
      setOtpError('Please enter the 6-digit code')
      return
    }

    setIsOtpLoading(true)
    setOtpError(null)
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: otpState.challengeId,
          code: otpCode.trim(),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setOtpError(result.error || 'Invalid code. Please try again.')
        return
      }

      const actualRole = result.data?.role || result.role || '';
      const isStaff = ['SUPER_ADMIN', 'ADMIN', 'VOLUNTEER'].includes(actualRole);
      setOtpState(null)
      resetCachedRole();
      router.push(isStaff ? '/dashboard' : '/dashboard/user-portal')
      router.refresh()
    } catch {
      setOtpError('An unexpected error occurred. Please try again.')
    } finally {
      setIsOtpLoading(false)
    }
  }

  async function handleResendOtp() {
    if (!otpState || resendIn > 0) return
    setIsOtpLoading(true)
    setOtpError(null)
    try {
      const response = await fetch('/api/auth/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: otpState.challengeId }),
      })

      const result = await response.json()

      if (!result.success) {
        setOtpError(result.error || 'Failed to resend code')
        return
      }

      setResendIn(result.resendAfter || 60)
    } catch {
      setOtpError('An unexpected error occurred. Please try again.')
    } finally {
      setIsOtpLoading(false)
    }
  }

  function handleOtpBack() {
    setOtpState(null)
    setOtpCode('')
    setOtpError(null)
    setError(null)
    setSelectedRole(null)
    reset()
    setShowPassword(false)
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
                      Choose how you&apos;d like to sign in
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Management Login */}
                    {mgmtLockRemaining > 0 ? (
                      <div
                        className="flex w-full items-center gap-4 rounded-xl border border-l-4 border-red-500/40 border-l-red-500 bg-red-500/5 p-5 text-left backdrop-blur"
                        style={{ animation: 'fadeIn 0.4s ease-out both' }}
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 ring-2 ring-red-500/20">
                          <Lock className="size-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-foreground">
                            Management Login Locked
                          </h3>
                          <p className="mt-0.5 text-base text-muted-foreground">
                            Too many failed attempts. Try again in {mgmtLockRemaining}s.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setMgmtStage((s) => (s === 'idle' ? 'warning' : 'idle'))
                        }
                        aria-expanded={mgmtStage !== 'idle'}
                        className="group flex w-full items-center gap-4 rounded-xl border border-l-4 border-border/50 border-l-[#7C3AED] bg-card/80 p-5 text-left backdrop-blur transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:backdrop-blur-md active:scale-[0.98]"
                        style={{ animation: 'fadeIn 0.4s ease-out both' }}
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10 ring-2 ring-[#7C3AED]/20 transition-all duration-200 group-hover:scale-105">
                          <Shield className="size-5 text-[#7C3AED]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-foreground">
                            Management Login
                          </h3>
                          <p className="mt-0.5 text-base text-muted-foreground">
                            Super Admin, Admin &amp; Volunteer / Investigator portals
                          </p>
                        </div>
                        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${mgmtStage !== 'idle' ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    {mgmtFailures > 0 && mgmtLockRemaining === 0 && (
                      <p className="text-sm text-amber-500">
                        Failed management attempts: {mgmtFailures} / {MGMT_LOCK_THRESHOLD}. The
                        management login will lock temporarily after {MGMT_LOCK_THRESHOLD} failed
                        attempts.
                      </p>
                    )}

                    {/* Restricted area warning */}
                    {mgmtStage === 'warning' && (
                      <div
                        className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                          <div>
                            <h4 className="text-base font-bold text-foreground">
                              Restricted Area
                            </h4>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              This portal is for authorized YCKF staff only (Super Admin,
                              Admin &amp; Volunteer / Investigator). Unauthorized access
                              attempts are monitored, logged and may be reported to law
                              enforcement. Do not proceed unless you are a staff member.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <Button
                            type="button"
                            onClick={handleStaffContinue}
                            className="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] font-medium shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:from-[#7C3AED]/90 hover:to-[#8B5CF6]/90"
                          >
                            I&apos;m authorized staff &mdash; Continue
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setMgmtStage('idle')}
                            className="flex-1 text-muted-foreground"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Staff access code */}
                    {mgmtStage === 'code' && (
                      <div
                        className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur"
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                      >
                        <div className="flex items-start gap-3">
                          <KeyRound className="mt-0.5 size-5 shrink-0 text-[#7C3AED]" />
                          <div>
                            <h4 className="text-base font-bold text-foreground">
                              Staff Access Code
                            </h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Enter your staff access code to unlock the management login
                              portals.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Input
                            type="password"
                            inputMode="numeric"
                            placeholder="Staff access code"
                            value={staffCode}
                            onChange={(e) => setStaffCode(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleStaffCodeVerify()
                            }}
                            disabled={isStaffCodeLoading}
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                          />
                        </div>
                        {staffCodeError && (
                          <p className="mt-2 text-sm text-red-500">{staffCodeError}</p>
                        )}
                        <div className="mt-4 flex gap-3">
                          <Button
                            type="button"
                            onClick={handleStaffCodeVerify}
                            disabled={isStaffCodeLoading}
                            className="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] font-medium shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:from-[#7C3AED]/90 hover:to-[#8B5CF6]/90"
                          >
                            {isStaffCodeLoading ? 'Verifying...' : 'Unlock'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setMgmtStage('warning')}
                            className="flex-1 text-muted-foreground"
                          >
                            Back
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Management role dropdown */}
                    {mgmtStage === 'menu' && (
                      <>
                      <div
                        className="overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur"
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                      >
                        {managementRoles.map((role, index) => {
                          const Icon = role.icon
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => openRoleForm(role.id)}
                              className="group flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-card"
                              style={{
                                animation: `fadeIn 0.25s ease-out ${index * 0.05}s both`,
                              }}
                            >
                              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${role.iconBg} ring-1 ${role.iconRing}`}>
                                <Icon className={`size-4 ${role.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-base font-semibold text-foreground">
                                  {role.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {role.subtitle}
                                </p>
                              </div>
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-6">
                        <div className="relative mb-3 flex items-center justify-center gap-3">
                          <div className="h-px flex-1 bg-border/60" />
                          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Quick access
                          </span>
                          <div className="h-px flex-1 bg-border/60" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {quickLoginAccounts.map((account, index) => (
                            <button
                              key={account.role}
                              type="button"
                              onClick={() =>
                                handleQuickLogin(account.role, account.identifier, account.password)
                              }
                              className="group flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-card/80 p-3 text-center backdrop-blur transition-all duration-200 hover:border-[#2DD4BF]/40 hover:bg-card hover:shadow-lg hover:shadow-[#2DD4BF]/5 active:scale-[0.98]"
                              style={{
                                animation: `fadeIn 0.4s ease-out ${0.4 + index * 0.1}s both`,
                              }}
                            >
                              <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-[#2DD4BF]">
                                {account.label}
                              </span>
                              <span className="max-w-full truncate text-xs text-muted-foreground">
                                {account.description}
                              </span>
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-center text-xs text-muted-foreground/70">
                          One-tap demo sign in with the seeded demo accounts
                        </p>
                      </div>
                      </>
                    )}

                    {/* User Login */}
                    <button
                      type="button"
                      onClick={() => openRoleForm('user')}
                      className="group flex w-full items-center gap-4 rounded-xl border border-l-4 border-border/50 border-l-muted-foreground bg-card/80 p-5 text-left backdrop-blur transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:backdrop-blur-md active:scale-[0.98]"
                      style={{ animation: 'fadeIn 0.4s ease-out 0.1s both' }}
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 ring-2 ring-muted-foreground/20 transition-all duration-200 group-hover:scale-105">
                        <User className="size-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-foreground">
                          User Login
                        </h3>
                        <p className="mt-0.5 text-base text-muted-foreground">
                          Report incidents, track cases &amp; access courses
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </button>
                  </div>

                  <div className="mt-5 pt-4 text-center space-y-3">
                    <Link
                      href="/forgot-password"
                      className="block text-sm font-medium text-[#2563EB] underline-offset-4 transition-colors hover:underline hover:text-[#2563EB]/80"
                    >
                      Forgot your password? Reset it here
                    </Link>
                    <Link
                      href="/staff-password-request"
                      className="block text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:underline hover:text-foreground"
                    >
                      Staff forgot your email or password? Request a reset from the Super Admin
                    </Link>
                    <Link
                      href="/volunteers"
                      className="block text-sm font-semibold text-[#2563EB] underline-offset-4 transition-colors hover:underline hover:text-[#2563EB]/80"
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
                    Back to login options
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

                      {otpState ? (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center text-center">
                            <div className={`mb-3 flex size-14 items-center justify-center rounded-2xl ${activeRole.iconBg} ring-2 ${activeRole.iconRing}`}>
                              <KeyRound className={`size-7 ${activeRole.color}`} />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                              Enter Verification Code
                            </h3>
                            {otpState.message ? (
                              <p className="mt-1 text-base text-muted-foreground">
                                {otpState.message}
                              </p>
                            ) : (
                              <p className="mt-1 text-base text-muted-foreground">
                                Enter the 6-digit code sent to{' '}
                                {otpState.maskedEmail || otpState.maskedPhone || 'your email'}
                              </p>
                            )}
                          </div>

                          {otpError && (
                            <Alert variant="destructive">
                              <AlertCircle className="size-4" />
                              <AlertDescription>{otpError}</AlertDescription>
                            </Alert>
                          )}

                          <Field>
                            <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="6-digit code"
                                autoComplete="one-time-code"
                                value={otpCode}
                                onChange={(e) =>
                                  setOtpCode(e.target.value.replace(/[^0-9]/g, ''))
                                }
                                className="pl-9 text-center text-2xl font-bold tracking-[0.4em]"
                              />
                            </div>
                          </Field>

                          <Button
                            type="button"
                            onClick={handleVerifyOtp}
                            className="w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] font-medium shadow-lg shadow-[#2563EB]/25 transition-all duration-200 hover:from-[#2563EB]/90 hover:to-[#3B82F6]/90 hover:shadow-xl hover:shadow-[#2563EB]/30"
                            disabled={isOtpLoading}
                          >
                            {isOtpLoading ? (
                              <span className="flex items-center gap-2">
                                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Verifying...
                              </span>
                            ) : (
                              'Verify & Sign In'
                            )}
                          </Button>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              disabled={resendIn > 0 || isOtpLoading}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] transition-colors hover:text-[#2563EB]/80 disabled:cursor-not-allowed disabled:text-muted-foreground/50"
                            >
                              <RefreshCw className="size-3.5" />
                              {resendIn > 0
                                ? `Resend code in ${resendIn}s`
                                : 'Resend code'}
                            </button>
                            <button
                              type="button"
                              onClick={handleOtpBack}
                              disabled={isOtpLoading}
                              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      ) : (
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
                          <Field data-invalid={!!errors.identifier}>
                            <FieldLabel htmlFor="identifier">Email or Phone Number</FieldLabel>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="identifier"
                                type="text"
                                placeholder="you@example.com or +233 55 000 0000"
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                aria-invalid={!!errors.identifier}
                                className="pl-9"
                                {...register('identifier')}
                              />
                            </div>
                            {errors.identifier && (
                              <FieldDescription className="text-destructive">
                                {errors.identifier.message}
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
                                autoComplete="current-password"
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

                        <div className="flex items-center justify-end">
                          <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-[#2563EB] underline-offset-4 transition-colors hover:underline hover:text-[#2563EB]/80"
                          >
                            Forgot password?
                          </Link>
                        </div>

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
                      )}
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
