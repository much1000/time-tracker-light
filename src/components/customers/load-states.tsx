import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// Ladezustand: Platzhalter in der Form der Karten, mit Hinweis für Screenreader.
export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Wird geladen" className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  )
}

// Fehlerzustand mit Weg zurück («Erneut versuchen»).
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>Die Daten konnten nicht geladen werden.</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Erneut versuchen
        </Button>
      </AlertDescription>
    </Alert>
  )
}
