'use client'

import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { resetPreviewData } from '@/lib/customers'

// PLATZHALTER-HINWEIS (PROJ-3, Frontend). Entfällt mit `/backend`, sobald echte Daten angeschlossen sind.
export function PreviewNotice({ onReset }: { onReset: () => void }) {
  return (
    <Alert role="note">
      <Info className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Vorschau: Diese Daten liegen nur in diesem Browser und sind noch nicht in der Datenbank.
        </span>
        <Button
          type="button"
          variant="link"
          className="h-auto min-h-0 p-0"
          onClick={() => {
            resetPreviewData()
            onReset()
          }}
        >
          Zurücksetzen
        </Button>
      </AlertDescription>
    </Alert>
  )
}
