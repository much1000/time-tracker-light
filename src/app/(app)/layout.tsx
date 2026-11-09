import { AppShell } from '@/components/app-shell'

// Alle Seiten in dieser Gruppe erhalten Navigation und App-Rahmen.
// Seiten ohne Navigation (z. B. die Anmeldung in PROJ-2) liegen ausserhalb.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
