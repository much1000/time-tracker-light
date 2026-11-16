'use client'

import { AlertTriangle, CalendarX, ChevronLeft, ChevronRight, Plus, SearchX } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { LoadError } from '@/components/customers/load-states'
import { EntryRow } from '@/components/time-entries/entry-row'
import { Sums } from '@/components/time-entries/sums'
import { TimeEntryFormDialog } from '@/components/time-entries/time-entry-form-dialog'
import { useEntryActions } from '@/components/time-entries/use-entry-actions'
import { useTimer } from '@/components/timer/timer-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useRepositoryData } from '@/hooks/use-repository-data'
import { getCustomersRepository } from '@/lib/customers'
import { getTimeEntriesRepository, type MonthEntries, type TimeEntry } from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'
import { formatMonthLabel, isCurrentMonth, resolveMonth, shiftMonth } from '@/lib/time-entries/month'
import { sumEntries } from '@/lib/time-entries/validation'
import { formatDate, formatLongDate, todayInZurich } from '@/lib/time-entries/zurich'

const ALL_CUSTOMERS = 'all'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface DayGroup {
  date: string
  entries: TimeEntry[]
}

// Die Liste ist nach Datum absteigend sortiert: aufeinanderfolgende Einträge desselben Tages bilden eine Gruppe.
function groupByDay(entries: TimeEntry[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    if (last && last.date === entry.date) last.entries.push(entry)
    else groups.push({ date: entry.date, entries: [entry] })
  }
  return groups
}

interface LoadedMonth extends MonthEntries {
  // Ansicht, zu der die Daten gehören (verhindert, dass Daten eines anderen Monats stehen bleiben)
  viewKey: string
}

// Seite «Zeiten»: Einträge eines Monats prüfen, filtern, korrigieren und löschen (PROJ-5).
// Monat und Filter stehen in der Adresse (?monat=2026-10&kunde=…&ohne-beschreibung=1).
export function ZeitenView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { entriesVersion } = useTimer()

  const month = resolveMonth(params.get('monat'))
  const customerParam = params.get('kunde')
  const customerId = customerParam && UUID.test(customerParam) ? customerParam : undefined
  const withoutDescription = params.get('ohne-beschreibung') === '1'
  const filterActive = customerId !== undefined || withoutDescription
  const viewKey = `${month}|${customerId ?? ''}|${withoutDescription ? 1 : 0}`

  const { state, reload, retry } = useRepositoryData<LoadedMonth>(async () => {
    const result = await getTimeEntriesRepository().listMonth({ month, customerId, withoutDescription })
    return { ...result, viewKey }
  }, `${viewKey}|${entriesVersion}`)
  const { state: customersState } = useRepositoryData(() => getCustomersRepository().listCustomers(), 'customers')

  const [creating, setCreating] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const actions = useEntryActions({
    onChanged: reload,
    containerRef: listRef,
    fallbackRef: headingRef,
    isVisible: (entry) => entry.date.startsWith(month),
  })

  function navigate(next: { month?: string; customerId?: string; withoutDescription?: boolean }) {
    const query = new URLSearchParams()
    const nextMonth = next.month ?? month
    if (!isCurrentMonth(nextMonth)) query.set('monat', nextMonth)
    const nextCustomer = 'customerId' in next ? next.customerId : customerId
    if (nextCustomer) query.set('kunde', nextCustomer)
    const nextWithout = 'withoutDescription' in next ? next.withoutDescription : withoutDescription
    if (nextWithout) query.set('ohne-beschreibung', '1')
    const text = query.toString()
    router.push(text ? `${pathname}?${text}` : pathname, { scroll: false })
  }

  // Daten eines anderen Monats oder Filters zählen als «lädt noch»
  const current = state.status === 'ready' && state.data.viewKey === viewKey ? state.data : null
  const loading = state.status === 'loading' || (state.status === 'ready' && current === null)
  const entries = current?.entries ?? []
  const sums = sumEntries(entries)
  const groups = groupByDay(entries)
  const customers = customersState.status === 'ready' ? customersState.data : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
          Zeiten
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
          onClick={() => navigate({ month: shiftMonth(month, -1) })}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 className="text-center text-lg font-semibold" aria-live="polite">
          {formatMonthLabel(month)}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Nächster Monat"
          disabled={isCurrentMonth(month)}
          onClick={() => navigate({ month: shiftMonth(month, 1) })}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2 sm:w-72">
          <Label htmlFor="zeiten-customer">Kunde</Label>
          <Select
            value={customerId ?? ALL_CUSTOMERS}
            onValueChange={(value) => {
              if (value) navigate({ customerId: value === ALL_CUSTOMERS ? undefined : value })
            }}
          >
            <SelectTrigger id="zeiten-customer" className="h-11">
              <SelectValue placeholder="Alle Kunden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CUSTOMERS}>Alle Kunden</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  <span className="font-mono">{customer.code}</span> · {customer.name}
                  {customer.archived ? ' (archiviert)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-h-11 items-center gap-3">
          <Switch
            id="zeiten-without-description"
            checked={withoutDescription}
            onCheckedChange={(checked) => navigate({ withoutDescription: checked })}
          />
          <Label htmlFor="zeiten-without-description">Nur ohne Beschreibung</Label>
        </div>
        {filterActive && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ customerId: undefined, withoutDescription: false })}
          >
            Filter zurücksetzen
          </Button>
        )}
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
            Es werden nicht alle Einträge angezeigt, bitte Filter nutzen. Die Summen sind unvollständig.
          </AlertDescription>
        </Alert>
      )}

      {current && entries.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            {filterActive ? (
              <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            ) : (
              <CalendarX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                {filterActive ? 'Keine Einträge für diesen Filter' : `Keine Einträge im ${formatMonthLabel(month)}`}
              </h2>
              <p className="text-muted-foreground">
                {filterActive
                  ? 'Passe den Filter an oder setze ihn zurück.'
                  : 'Erfasse Zeit mit dem Timer oder trage sie nach.'}
              </p>
            </div>
            {filterActive ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ customerId: undefined, withoutDescription: false })}
              >
                Filter zurücksetzen
              </Button>
            ) : (
              <Button type="button" onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" />
                Zeit erfassen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {current && entries.length > 0 && (
        <div ref={listRef} className="space-y-6">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Gearbeitet im Monat</p>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(sums.worked)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verrechenbar im Monat</p>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(sums.billable)}</p>
              </div>
            </CardContent>
          </Card>

          {groups.map((group) => {
            const daySums = sumEntries(group.entries)
            return (
              <section key={group.date} aria-labelledby={`day-${group.date}`} className="space-y-3">
                <div className="space-y-0.5">
                  <h3 id={`day-${group.date}`} className="text-base font-semibold">
                    {formatLongDate(group.date)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    <Sums worked={daySums.worked} billable={daySums.billable} />
                  </p>
                </div>
                <ul className="space-y-2">
                  {group.entries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} onEdit={actions.onEdit} onDelete={actions.onDelete} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <TimeEntryFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(entry) => {
          toast.success(
            entry.date === todayInZurich() ? 'Eintrag gespeichert.' : `Gespeichert am ${formatDate(entry.date)}.`
          )
          reload()
        }}
      />
      {actions.dialogs}
    </div>
  )
}
