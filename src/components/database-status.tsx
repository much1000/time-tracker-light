import { AlertTriangle, CheckCircle2, CloudOff } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { DatabaseStatus as DatabaseStatusResult } from '@/lib/supabase/health'

interface DatabaseStatusProps {
  result: DatabaseStatusResult
}

// Zeigt das Ergebnis des Verbindungstests. Der Zustand wird nie nur über Farbe,
// sondern immer auch über Symbol und Text angezeigt.
export function DatabaseStatus({ result }: DatabaseStatusProps) {
  if (result.status === 'ok') {
    return (
      <Alert role="status">
        <CheckCircle2
          className="h-4 w-4 !text-success"
          aria-hidden="true"
        />
        <AlertTitle>Datenbank erreichbar</AlertTitle>
        <AlertDescription>
          Die Verbindung zu Supabase funktioniert.
        </AlertDescription>
      </Alert>
    )
  }

  if (result.status === 'config-error') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Konfiguration unvollständig</AlertTitle>
        <AlertDescription>
          <p>
            Bitte prüfe diese Variablen in <code>.env.local</code> (lokal) oder
            in den Vercel-Einstellungen:
          </p>
          <ul className="mt-2 list-disc pl-5">
            {result.variables.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive" role="alert">
      <CloudOff className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Datenbank nicht erreichbar</AlertTitle>
      <AlertDescription>{result.message}</AlertDescription>
    </Alert>
  )
}
