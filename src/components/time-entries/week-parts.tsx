import { Badge } from '@/components/ui/badge'
import { speakDuration } from '@/lib/time-entries/duration'
import type { WeekCell, WeekRow } from '@/lib/time-entries/week-summary'
import { formatLongDate } from '@/lib/time-entries/zurich'

// Kunde · Projekt einer Zeile in der Wochenübersicht (Raster und Tageskarten), mit Hinweis «archiviert».
export function ProjectLabel({ row }: { row: WeekRow }) {
  const archived = row.customerArchived || row.projectArchived
  return (
    <span className="block min-w-0 space-y-0.5 text-left">
      <span className="block break-words font-medium">
        <span className="font-mono text-sm text-muted-foreground">{row.customerCode}</span>
        <span className="text-muted-foreground"> · </span>
        {row.projectName}
      </span>
      <span className="block break-words text-xs font-normal text-muted-foreground">{row.customerName}</span>
      {archived && (
        <Badge variant="outline" className="font-normal">
          archiviert
        </Badge>
      )}
    </span>
  )
}

// Name einer Zelle für Screenreader: «Muster AG Allgemein, Montag, 9. November 2026, 1 Stunde 30 Minuten»
export function cellLabel(row: WeekRow, cell: WeekCell): string {
  return `${row.customerName} ${row.projectName}, ${formatLongDate(cell.date)}, ${speakDuration(cell.worked)}`
}

// Wird beim Antippen einer Zelle oder Projektzeile aufgerufen; «trigger» ist der angetippte Knopf (für die Fokus-Rückgabe).
export type OpenCell = (row: WeekRow, cell: WeekCell, trigger: HTMLElement) => void
