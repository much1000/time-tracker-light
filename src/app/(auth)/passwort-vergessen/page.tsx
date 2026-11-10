import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Passwort zurücksetzen',
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string | string[] }>
}) {
  const { fehler } = await searchParams

  return (
    <AuthCard
      title="Passwort zurücksetzen"
      description="Wir senden dir einen Link, mit dem du ein neues Passwort festlegst."
    >
      <ForgotPasswordForm linkInvalid={fehler === 'link'} />
    </AuthCard>
  )
}
