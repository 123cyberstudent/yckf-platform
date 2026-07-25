import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Login - YCKF Security Portal',
  description: 'Sign in to the YCKF Incident Management Dashboard',
}

export default function LoginPage() {
  return <LoginForm />
}
