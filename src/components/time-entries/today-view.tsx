'use client'

import { Clock, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { LoadError } from '@/components/customers/load-states'
import { EntryRow } from '@/components/time-entries/entry-row'
import { TimeEntryFormDialog } from '@/components/time-entries/time-entry-form-dialog'
import { useTimer } from '@/components/timer/timer-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepositoryData } from '@/hooks/use-repository-data'
import { getTimeEntriesRepository } from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'
import { sumEntries } from '@/lib/time-entries/validation'
import { formatDate, formatLongDate, todayInZurich } from '@/lib/time-entries/zurich'

// Startseite: Knopf «Zeit erfassen» und die heute erfassten Einträge mit Tagessumme.
export function TodayView({ timerSection }: { timerSection?: ReactNode }) {
  const today = todayInZurich()
  // Nach einem Stopp (neue Einträge) lädt die Liste neu
  const { entriesVersion } = useTimer()
  const { state, reload, retry } = useRepositoryData(
    () => getTimeEntriesRepository().listEntries(today),
    `${today}-${entriesVersion}`
  )
  const [creating, setCreating] = useState(false)

  const entries = state.status === 'ready' ? state.data : []
  const sums = sumEntries(entries)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Heute</h1>
          <p className="text-muted-foreground">{formatLongDate(today)}</p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Zeit erfassen
        </Button>
      </div>

      {timerSection}

      {state.status === 'loading' && (
        <div role="status" aria-label="Wird geladen" className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}
      {state.status === 'error' && <LoadError onRetry={retry} />}

      {state.status === 'ready' && entries.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            <Clock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Heute noch nichts erfasst</h2>
              <p className="text-muted-foreground">
                Erfasse deine erste Arbeitszeit für heute, oder trage eine frühere nach.
              </p>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Zeit erfassen
            </Button>
          </CardContent>
        </Card>
      )}

      {state.status === 'ready' && entries.length > 0 && (
        <section aria-labelledby="today-entries" className="space-y-4">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Gearbeitet</p>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(sums.worked)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verrechenbar</p>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(sums.billable)}</p>
              </div>
            </CardContent>
          </Card>
          <h2 id="today-entries" className="text-lg font-semibold">
            Einträge
          </h2>
          <ul className="space-y-2">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      )}

      <TimeEntryFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(entry) => {
          toast.success(
            entry.date === today ? 'Eintrag gespeichert.' : `Gespeichert am ${formatDate(entry.date)}.`
          )
          reload()
        }}
      />
    </div>
  )
}
