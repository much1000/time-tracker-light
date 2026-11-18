import { FileText } from 'lucide-react'
import Link from 'next/link'
import { entryLabel } from '@/components/time-entries/entry-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TimeEntry } from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'
import type { MonthSums } from '@/lib/time-entries/month-summary'
import { formatDayShort } from '@/lib/time-entries/week'

// Die drei Zahlen der Monatsauswertung (Gesamtzeile, Kunde, Projekt): gearbeitet, verrechenbar exakt und
// verrechenbar gerundet auf 15 Minuten. Am Handy untereinander, ab 640 px nebeneinander. Die gerundete Zahl
// ist die für die Rechnung und deshalb hervorgehoben (Fettschrift, nicht nur Farbe).
export function MonthNumbers({ sums, label }: { sums: MonthSums; label: string }) {
  return (
    <dl aria-label={label} className="grid gap-1 sm:grid-cols-3 sm:gap-4">
      <Figure term="Gearbeitet" value={formatDuration(sums.worked)} />
      <Figure term="Verrechenbar" value={formatDuration(sums.billable)} />
      <Figure term="Verrechenbar gerundet auf 15 Min." value={formatDuration(sums.billableRounded)} strong />
    </dl>
  )
}

function Figure({ term, value, strong = false }: { term: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <dt className="min-w-0 text-sm text-muted-foreground">{term}</dt>
      <dd className={strong ? 'shrink-0 text-lg font-bold tabular-nums' : 'shrink-0 text-lg font-semibold tabular-nums'}>
        {value}
      </dd>
    </div>
  )
}

// «archiviert»-Hinweis für Kunde oder Projekt
export function ArchivedBadge() {
  return (
    <Badge variant="outline" className="font-normal">
      archiviert
    </Badge>
  )
}

// «2026-11-09» -> «Mo 9.11.»
function dayWithMonth(date: string): string {
  return `${formatDayShort(date)}${Number(date.slice(5, 7))}.`
}

interface MonthEntryRowProps {
  entry: TimeEntry
  // Adresse der Seite «Zeiten» im gleichen Monat
  zeitenHref: string
}

// Ein Eintrag in der aufgeklappten Projektzeile: nur lesen. Korrigiert wird auf «Zeiten» (PROJ-5).
export function MonthEntryRow({ entry, zeitenHref }: MonthEntryRowProps) {
  return (
    <li data-entry-id={entry.id} className="space-y-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">
            <time dateTime={entry.date}>{dayWithMonth(entry.date)}</time>
          </p>
          {entry.startTime && entry.endTime && (
            <p className="text-sm text-muted-foreground">
              {entry.startTime}–{entry.endTime}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums">{formatDuration(entry.durationMinutes)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            verrechenbar {formatDuration(entry.billableMinutes)}
          </p>
        </div>
      </div>
      {entry.description ? (
        <p className="whitespace-pre-line break-words text-sm">{entry.description}</p>
      ) : (
        <Badge variant="outline" className="gap-1 font-normal">
          <FileText className="h-3 w-3" aria-hidden="true" />
          Keine Beschreibung
        </Badge>
      )}
      <Button asChild variant="link" className="-ml-4 h-11">
        <Link href={zeitenHref} aria-label={`In Zeiten ansehen: ${entryLabel(entry)}`}>
          In Zeiten ansehen
        </Link>
      </Button>
    </li>
  )
}
