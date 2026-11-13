'use client'

import { AlertTriangle, Circle, LoaderCircle, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ConfirmArchiveDialog } from '@/components/customers/confirm-archive-dialog'
import { Elapsed, useIsLongRunning } from '@/components/timer/elapsed'
import { useTimer } from '@/components/timer/timer-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { elapsedMs, formatElapsedMinutes, formatStartClock } from '@/lib/timer/format'
import type { RunningTimer } from '@/lib/timer'
import { DESCRIPTION_MAX_LENGTH } from '@/lib/time-entries/validation'

// Pause in der Eingabe, nach der die Beschreibung gespeichert wird (Tech Design: etwa 1,5 Sekunden)
const SAVE_DELAY_MS = 1500

// Karte «Timer läuft» auf der Startseite: Kunde, Projekt, Startzeit, laufende Zeit, Beschreibung,
// «Stopp» und «Verwerfen».
export function TimerCard() {
  const { timer } = useTimer()
  if (!timer) return null
  // Neuer Timer: Eingabefeld und Speicherstand beginnen frisch
  return <RunningCard key={timer.id} timer={timer} />
}

function RunningCard({ timer }: { timer: RunningTimer }) {
  const { status, offsetMs, busy, stop, discard, saveDescription } = useTimer()
  const [text, setText] = useState(timer.description ?? '')
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const lastSaved = useRef(timer.description ?? '')
  const textRef = useRef(text)
  textRef.current = text
  const long = useIsLongRunning(timer.startedAt, offsetMs)

  const tooLong = text.trim().length > DESCRIPTION_MAX_LENGTH
  const locked = busy !== null

  async function flush() {
    const current = textRef.current
    if (current === lastSaved.current || current.trim().length > DESCRIPTION_MAX_LENGTH) return
    const ok = await saveDescription(current)
    if (ok) {
      lastSaved.current = current
      setSaveFailed(false)
    } else {
      setSaveFailed(true)
    }
  }

  // Nach einer Pause in der Eingabe speichern
  useEffect(() => {
    if (text === lastSaved.current || tooLong) return
    const id = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
    return () => window.clearTimeout(id)
    // flush liest den aktuellen Text aus einer Referenz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, tooLong])

  const stopping = busy?.kind === 'stop'
  const discarding = busy?.kind === 'discard'

  return (
    <Card role="region" aria-label="Laufender Timer">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <Circle className="h-3 w-3 fill-current" aria-hidden="true" />
              Timer läuft
            </p>
            <p className="break-words text-lg font-semibold">
              <span className="font-mono text-base text-muted-foreground">{timer.customerCode}</span>
              <span className="text-muted-foreground"> · </span>
              {timer.projectName}
            </p>
            <p className="break-words text-sm text-muted-foreground">
              {timer.customerName} · gestartet um {formatStartClock(timer.startedAt)}
            </p>
          </div>
          <Elapsed
            startedAt={timer.startedAt}
            offsetMs={offsetMs}
            className="text-3xl font-bold tabular-nums"
          />
        </div>

        {long && (
          <Alert role="note">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>Läuft schon sehr lange. Vergessen zu stoppen?</AlertDescription>
          </Alert>
        )}
        {status === 'error' && (
          <Alert role="note">
            <AlertDescription>
              Keine Verbindung. Der Timer läuft weiter, die Anzeige wird wieder aktualisiert, sobald
              die Verbindung da ist.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="timer-description">Beschreibung (optional)</Label>
          <Textarea
            id="timer-description"
            rows={2}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => void flush()}
            aria-invalid={tooLong}
            aria-describedby="timer-description-hint"
          />
          <p
            id="timer-description-hint"
            className={tooLong ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}
          >
            {tooLong
              ? `Die Beschreibung darf höchstens ${DESCRIPTION_MAX_LENGTH} Zeichen haben.`
              : saveFailed
                ? 'Konnte nicht gespeichert werden. Wird beim nächsten Tippen erneut versucht.'
                : 'Wird automatisch gespeichert und beim Stoppen im Eintrag übernommen.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={locked || tooLong}
            onClick={() => void stop(textRef.current)}
          >
            {stopping ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                Wird gespeichert …
              </>
            ) : (
              <>
                <Square aria-hidden="true" />
                Stopp
              </>
            )}
          </Button>
          <Button type="button" variant="outline" disabled={locked} onClick={() => setConfirmDiscard(true)}>
            Verwerfen
          </Button>
        </div>
      </CardContent>

      <ConfirmArchiveDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        busy={discarding}
        title="Timer verwerfen?"
        description={`Die gemessene Zeit (${formatElapsedMinutes(elapsedMs(timer.startedAt, Date.now(), offsetMs))}) wird nicht gespeichert. Es entsteht kein Zeiteintrag.`}
        confirmLabel="Verwerfen"
        busyLabel="Wird verworfen …"
        onConfirm={async () => {
          const ok = await discard()
          if (ok) setConfirmDiscard(false)
        }}
      />
    </Card>
  )
}
