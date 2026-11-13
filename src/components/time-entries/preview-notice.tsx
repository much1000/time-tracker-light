'use client'

import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { resetPreviewEntries } from '@/lib/time-entries'

// PLATZHALTER-HINWEIS (PROJ-4, Frontend). Entfällt mit `/backend`, sobald echte Daten angeschlossen sind.
export function PreviewNotice({ onReset }: { onReset: () => void }) {
  return (
    <Alert role="note">
      <Info className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Vorschau: Die erfassten Zeiten liegen nur in diesem Browser und sind noch nicht in der
          Datenbank. Kunden und Projekte sind echt.
        </span>
        <Button
          type="button"
          variant="link"
          className="h-11 px-0"
          onClick={() => {
            resetPreviewEntries()
            onReset()
          }}
        >
          Zurücksetzen
        </Button>
      </AlertDescription>
    </Alert>
  )
}
