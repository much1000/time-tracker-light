import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'

// Alle Seiten in dieser Gruppe erhalten Navigation und App-Rahmen.
// Seiten ohne Navigation (die Anmeldung) liegen ausserhalb in der Gruppe «(auth)».
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Zweite Verteidigungslinie: Der Türsteher (proxy.ts) leitet Nicht-Angemeldete schon
  // vorher um. Diese Prüfung schützt, falls er einmal umgangen oder falsch konfiguriert wird.
  let signedIn = false
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    signedIn = Boolean(data?.claims?.sub)
  } catch {
    signedIn = false
  }
  if (!signedIn) redirect('/login')

  return <AppShell>{children}</AppShell>
}
