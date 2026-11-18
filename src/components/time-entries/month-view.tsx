'use client'

import { AlertTriangle, CalendarX, ChevronLeft, ChevronRight, Info, Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { LoadError } from '@/components/customers/load-states'
import { MonthCustomerSection } from '@/components/time-entries/month-customer-section'
import { MonthNumbers } from '@/components/time-entries/month-parts'
import { TimeEntryFormDialog } from '@/components/time-entries/time-entry-form-dialog'
import { useTimer } from '@/components/timer/timer-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepositoryData } from '@/hooks/use-repository-data'
import { getTimeEntriesRepository, type MonthEntries } from '@/lib/time-entries'
import { currentMonth, formatMonthLabel, isCurrentMonth, resolveMonth, shiftMonth } from '@/lib/time-entries/month'
import { buildMonthSummary } from '@/lib/time-entries/month-summary'
import { formatDate, todayInZurich } from '@/lib/time-entries/zurich'

interface LoadedMonth extends MonthEntries {
  // Monat, zu dem die Daten gehören (verhindert, dass Daten eines anderen Monats stehen bleiben)
  month: string
}

// Seite «Monat»: Summen pro Kunde und Projekt, gearbeitet und verrechenbar (exakt und auf 15 Minuten
// aufgerundet), mit den Einträgen samt Beschreibung unter jedem Projekt (PROJ-8). Nur lesen.
// Der Monat steht in der Adresse (?monat=2026-11).
export function MonthView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { entriesVersion } = useTimer()

  const month = resolveMonth(params.get('monat'))
  const today = todayInZurich()

  const { state, reload, retry } = useRepositoryData<LoadedMonth>(async () => {
    const result = await getTimeEntriesRepository().listMonthReport(month)
    return { ...result, month }
  }, `${month}|${entriesVersion}`)

  // Daten eines anderen Monats zählen als «lädt noch»
  const current = state.status === 'ready' && state.data.month === month ? state.data : null
  const loading = state.status === 'loading' || (state.status === 'ready' && current === null)
  const summary = useMemo(() => (current ? buildMonthSummary(month, current.entries) : null), [current, month])

  const [creating, setCreating] = useState(false)
  // Aufgeklappte Projekte gelten nur für den angezeigten Monat: Bei jedem Monatswechsel (auch beim
  // Zurückblättern) sind alle wieder zugeklappt. Zurücksetzen während des Renderns (kein Effekt nötig).
  const [openProjects, setOpenProjects] = useState<string[]>([])
  const [openMonth, setOpenMonth] = useState(month)
  if (openMonth !== month) {
    setOpenMonth(month)
    setOpenProjects([])
  }
  const headingRef = useRef<HTMLHeadingElement>(null)

  const allProjectIds = summary ? summary.customers.flatMap((customer) => customer.projects.map((p) => p.projectId)) : []

  function setOpen(projectIds: string[]) {
    setOpenProjects(projectIds)
  }

  function toggleProject(projectId: string, open: boolean) {
    setOpen(open ? [...openProjects.filter((id) => id !== projectId), projectId] : openProjects.filter((id) => id !== projectId))
  }

  function navigate(next: string) {
    router.push(isCurrentMonth(next) ? pathname : `${pathname}?monat=${next}`, { scroll: false })
  }

  const isThisMonth = isCurrentMonth(month)
  const zeitenHref = isThisMonth ? '/zeiten' : `/zeiten?monat=${month}`
  const hasEntries = summary !== null && summary.customers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
          Monat
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
          aria-label="Vorheriger Monat"
          onClick={() => navigate(shiftMonth(month, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
          <h2 className="text-center text-lg font-semibold" aria-live="polite">
            {formatMonthLabel(month)}
          </h2>
          <Button type="button" variant="outline" disabled={isThisMonth} onClick={() => navigate(currentMonth())}>
            Dieser Monat
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Nächster Monat"
          disabled={isThisMonth}
          onClick={() => navigate(shiftMonth(month, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {isThisMonth && (
        <Alert role="status">
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>Laufender Monat, noch nicht abgeschlossen</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div role="status" aria-label="Wird geladen" className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}
      {state.status === 'error' && <LoadError onRetry={retry} />}

      {current?.truncated && (
        <Alert role="status">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Es werden nicht alle Einträge angezeigt. Die Zahlen dieses Monats sind unvollständig.
          </AlertDescription>
        </Alert>
      )}

      {summary && !hasEntries && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            <CalendarX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Keine Einträge in diesem Monat</h2>
              <p className="text-muted-foreground">Erfasse Zeit mit dem Timer oder trage sie nach.</p>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Zeit erfassen
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && hasEntries && (
        <>
          <section aria-labelledby="month-total-heading">
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 id="month-total-heading" className="text-lg font-semibold">
                  Gesamt
                </h3>
                <MonthNumbers sums={summary.total} label="Summe des Monats" />
                <p className="text-sm text-muted-foreground">Pro Projekt aufgerundet auf 15 Minuten.</p>
              </CardContent>
            </Card>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(allProjectIds)}>
              Alle aufklappen
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen([])}>
              Alle zuklappen
            </Button>
          </div>

          <div className="space-y-4">
            {summary.customers.map((customer) => (
              <MonthCustomerSection
                key={customer.customerId}
                customer={customer}
                openProjects={openProjects}
                onToggleProject={toggleProject}
                zeitenHref={zeitenHref}
              />
            ))}
          </div>
        </>
      )}

      <TimeEntryFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(entry) => {
          toast.success(entry.date === today ? 'Eintrag gespeichert.' : `Gespeichert am ${formatDate(entry.date)}.`)
          reload()
        }}
      />
    </div>
  )
}
