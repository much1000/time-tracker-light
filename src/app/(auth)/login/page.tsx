import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Anmelden',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const { next } = await searchParams

  return (
    <AuthCard title="Anmelden" description="Melde dich mit deiner E-Mail-Adresse an.">
      <LoginForm next={typeof next === 'string' ? next : undefined} />
    </AuthCard>
  )
}
