import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { NewPasswordForm } from '@/components/auth/new-password-form'
import { RECOVERY_COOKIE } from '@/lib/auth/recovery'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Passwort zurücksetzen',
}

// Nur mit eingelöstem Reset-Link (Marker) und Sitzung. Eine gewöhnliche Anmeldung genügt nicht.
export default async function NewPasswordPage() {
  let allowed = false
  try {
    const cookieStore = await cookies()
    if (cookieStore.get(RECOVERY_COOKIE)?.value === '1') {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      allowed = Boolean(data.user)
    }
  } catch {
    allowed = false
  }
  if (!allowed) redirect('/passwort-vergessen?fehler=link')

  return (
    <AuthCard title="Neues Passwort" description="Lege ein neues Passwort für dein Konto fest.">
      <NewPasswordForm />
    </AuthCard>
  )
}
