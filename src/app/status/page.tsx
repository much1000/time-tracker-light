import type { Metadata } from 'next'
import { DatabaseStatus } from '@/components/database-status'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { checkDatabase } from '@/lib/supabase/health'

export const metadata: Metadata = {
  title: 'Status',
}

// Der Test muss bei jedem Aufruf frisch laufen.
export const dynamic = 'force-dynamic'

export default async function StatusPage() {
  const result = await checkDatabase()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Systemstatus</h1>
          </CardTitle>
          <CardDescription>
            Prüft, ob die App ihre Datenbank erreicht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DatabaseStatus result={result} />
        </CardContent>
      </Card>
    </main>
  )
}
