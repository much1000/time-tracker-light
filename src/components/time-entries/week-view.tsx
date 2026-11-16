'use client'

import { AlertTriangle, CalendarX, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { LoadError } from '@/components/customers/load-states'
import { TimeEntryFormDialog } from '@/components/time-entries/time-entry-form-dialog'
import { useEntryActions } from '@/components/time-entries/use-entry-actions'
import { WeekCellDialog } from '@/components/time-entries/week-cell-dialog'
import { WeekDayCards } from '@/components/time-entries/week-day-cards'
import { WeekGrid } from '@/components/time-entries/week-grid'
import { useTimer } from '@/components/timer/timer-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepositoryData } from '@/hooks/use-repository-data'
import { getTimeEntriesRepository, type WeekEntries } from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'
import { currentWeek, formatWeekLabel, isCurrentWeek, resolveWeek, shiftWeek } from '@/lib/time-entries/week'
import { buildWeekSummary, findCell } from '@/lib/time-entries/week-summary'
import { formatDate, todayInZurich } from '@/lib/time-entries/zurich'

interface LoadedWeek extends WeekEntries {
  // Woche, zu der die Daten gehören (verhindert, dass Daten einer anderen Woche stehen bleiben)
  week: string
}

interface Selected {
  week: string
  projectId: string
  date: string
}

// Seite «Woche»: Stunden pro Projekt und Tag, Detail pro Zelle mit Bearbeiten und Löschen (PROJ-7).
// Die Woche steht in der Adresse (?woche=2026-W46).
export function WeekView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { entriesVersion } = useTimer()

  const week = resolveWeek(params.get('woche'))
  const today = todayInZurich()

  const { state, reload, retry } = useRepositoryData<LoadedWeek>(async () => {
    const result = await getTimeEntriesRepository().listWeek(week)
    return { ...result, week }
  }, `${week}|${entriesVersion}`)

  // Daten einer anderen Woche zählen als «lädt noch»
  const current = state.status === 'ready' && state.data.week === week ? state.data : null
  const loading = state.status === 'loading' || (state.status === 'ready' && current === null)
  const summary = useMemo(() => (current ? buildWeekSummary(week, current.entries) : null), [current, week])

  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Selected | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const detailListRef = useRef<HTMLUListElement>(null)

  // Das Detail zeigt die Einträge aus der geladenen Woche (keine Kopie): Nach jeder Änderung stimmt alles.
  const found = selected && selected.week === week && summary ? findCell(summary, selected.projectId, selected.date) : null
  // Ist die Zelle leer geworden (zum Beispiel alles gelöscht oder verschoben), wird die Auswahl vergessen
  if (selected && summary && selected.week === week && !found) setSelected(null)
  if (selected && selected.week !== week) setSelected(null)

  const actions = useEntryActions({
    onChanged: reload,
    containerRef: detailListRef,
    fallbackRef: headingRef,
    isVisible: (entry) => selected !== null && entry.projectId === selected.projectId && entry.date === selected.date,
  })

  // Nach dem Schliessen des Details: Fokus zur Zelle; gibt es sie nicht mehr, zur Wochenüberschrift
  function restoreAfterDetail(event: Event): boolean {
    const trigger = triggerRef.current
    triggerRef.current = null
    if (trigger?.isConnected) return false
    event.preventDefault()
    headingRef.current?.focus()
    return true
  }

  function navigate(next: string) {
    router.push(isCurrentWeek(next) ? pathname : `${pathname}?woche=${next}`, { scroll: false })
  }

  const isThisWeek = isCurrentWeek(week)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
          Woche
        </h1>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Zeit erfassen
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Vorherige Woche"
          onClick={() => navigate(shiftWeek(week, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
          <h2 className="text-center text-lg font-semibold" aria-live="polite">
            {formatWeekLabel(week)}
          </h2>
          <Button type="button" variant="outline" disabled={isThisWeek} onClick={() => navigate(currentWeek())}>
            Diese Woche
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Nächste Woche"
          disabled={isThisWeek}
          onClick={() => navigate(shiftWeek(week, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {loading && (
        <div role="status" aria-label="Wird geladen" className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )}
      {state.status === 'error' && <LoadError onRetry={retry} />}

      {current?.truncated && (
        <Alert role="status">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Es werden nicht alle Einträge angezeigt. Die Zahlen dieser Woche sind unvollständig.
          </AlertDescription>
        </Alert>
      )}

      {summary && summary.rows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            <CalendarX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Keine Einträge in dieser Woche</h2>
              <p className="text-muted-foreground">Erfasse Zeit mit dem Timer oder trage sie nach.</p>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Zeit erfassen
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && summary.rows.length > 0 && (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Gearbeitet in der Woche</p>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(summary.total.worked)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verrechenbar in der Woche</p>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(summary.total.billable)}</p>
              </div>
            </CardContent>
          </Card>

          <WeekGrid
            summary={summary}
            today={today}
            onOpenCell={(row, cell, trigger) => {
              triggerRef.current = trigger
              setSelected({ week, projectId: row.projectId, date: cell.date })
            }}
          />
          <WeekDayCards
            summary={summary}
            today={today}
            onOpenCell={(row, cell, trigger) => {
              triggerRef.current = trigger
              setSelected({ week, projectId: row.projectId, date: cell.date })
            }}
          />
        </>
      )}

      <WeekCellDialog
        selection={found}
        onClose={() => setSelected(null)}
        onEdit={actions.onEdit}
        onDelete={actions.onDelete}
        listRef={detailListRef}
        onCloseFocus={restoreAfterDetail}
      />
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
      {actions.dialogs}
    </div>
  )
}
