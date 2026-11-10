import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { NewPasswordForm } from '@/components/auth/new-password-form'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Passwort zurücksetzen',
}

// Ohne gültigen Link (und damit ohne Sitzung) gibt es hier nichts zu tun.
export default async function NewPasswordPage() {
  let signedIn = false
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    signedIn = Boolean(data.user)
  } catch {
    signedIn = false
  }
  if (!signedIn) redirect('/passwort-vergessen?fehler=link')

  return (
    <AuthCard title="Neues Passwort" description="Lege ein neues Passwort für dein Konto fest.">
      <NewPasswordForm />
    </AuthCard>
  )
}
