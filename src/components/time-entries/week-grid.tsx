import { cellLabel, ProjectLabel, type OpenCell } from '@/components/time-entries/week-parts'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDuration } from '@/lib/time-entries/duration'
import { formatDayShort, formatWeekLabel } from '@/lib/time-entries/week'
import type { WeekSummary } from '@/lib/time-entries/week-summary'

interface WeekGridProps {
  summary: WeekSummary
  today: string
  onOpenCell: OpenCell
}

// Raster Projekt × Wochentag (ab 1024 px; darunter zeigen die Tageskarten dieselben Daten).
// Echte Tabelle: Spaltenköpfe sind die Tage, Zeilenköpfe die Projekte. Zellen mit Einträgen sind Knöpfe.
export function WeekGrid({ summary, today, onOpenCell }: WeekGridProps) {
  return (
    <div className="hidden lg:block" data-testid="week-grid">
      <Table className="table-fixed">
        <caption className="sr-only">Stunden pro Projekt und Tag, {formatWeekLabel(summary.week)}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-[24%] px-2">
              Projekt
            </TableHead>
            {summary.days.map((date) => (
              <TableHead key={date} scope="col" className="px-1 text-center">
                <span className="block whitespace-nowrap">{formatDayShort(date)}</span>
                {date === today && <span className="block text-xs font-bold text-foreground">Heute</span>}
              </TableHead>
            ))}
            <TableHead scope="col" className="w-[19%] px-2 text-right">
              Summe
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.rows.map((row) => (
            <TableRow key={row.projectId}>
              <TableHead scope="row" className="h-auto px-2 py-2 align-middle font-normal text-foreground">
                <ProjectLabel row={row} />
              </TableHead>
              {row.cells.map((cell) => (
                <TableCell key={cell.date} className="p-0 text-center">
                  {cell.entries.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-full px-0 tabular-nums"
                      aria-label={cellLabel(row, cell)}
                      onClick={(event) => onOpenCell(row, cell, event.currentTarget)}
                    >
                      {formatDuration(cell.worked)}
                    </Button>
                  ) : (
                    <>
                      <span aria-hidden="true" className="text-muted-foreground">
                        –
                      </span>
                      <span className="sr-only">Keine Einträge</span>
                    </>
                  )}
                </TableCell>
              ))}
              <TableCell className="px-2 text-right text-xs tabular-nums">
                <span className="block">{formatDuration(row.worked)} gearbeitet</span>
                <span className="block text-muted-foreground">{formatDuration(row.billable)} verrechenbar</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead scope="row" className="px-2 text-foreground">
              Gearbeitet
            </TableHead>
            {summary.dayTotals.map((day, index) => (
              <TableCell key={summary.days[index]} className="px-1 text-center font-semibold tabular-nums">
                {day.worked > 0 ? formatDuration(day.worked) : '–'}
              </TableCell>
            ))}
            <TableCell className="px-2 text-right font-bold tabular-nums">{formatDuration(summary.total.worked)}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope="row" className="px-2 text-foreground">
              Verrechenbar
            </TableHead>
            {summary.dayTotals.map((day, index) => (
              <TableCell key={summary.days[index]} className="px-1 text-center font-normal tabular-nums">
                {day.billable > 0 ? formatDuration(day.billable) : '–'}
              </TableCell>
            ))}
            <TableCell className="px-2 text-right font-semibold tabular-nums">
              {formatDuration(summary.total.billable)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
