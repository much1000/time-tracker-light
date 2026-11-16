import { cellLabel, ProjectLabel, type OpenCell } from '@/components/time-entries/week-parts'
import { Sums } from '@/components/time-entries/sums'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration } from '@/lib/time-entries/duration'
import { rowsOfDay, type WeekSummary } from '@/lib/time-entries/week-summary'
import { formatLongDate } from '@/lib/time-entries/zurich'

interface WeekDayCardsProps {
  summary: WeekSummary
  today: string
  onOpenCell: OpenCell
}

// Tageskarten Montag bis Sonntag (unter 1024 px), dieselben Daten wie das Raster.
// Je Projekt eine Zeile; ein Tipp öffnet das Detail.
export function WeekDayCards({ summary, today, onOpenCell }: WeekDayCardsProps) {
  return (
    <div className="space-y-3 lg:hidden" data-testid="week-day-cards">
      {summary.days.map((date, index) => {
        const total = summary.dayTotals[index]
        const rows = rowsOfDay(summary, index)
        return (
          <section key={date} aria-labelledby={`week-day-${date}`}>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="space-y-0.5">
                  <h3 id={`week-day-${date}`} className="flex flex-wrap items-center gap-2 text-base font-semibold">
                    {formatLongDate(date)}
                    {date === today && (
                      <Badge variant="outline" className="font-bold">
                        Heute
                      </Badge>
                    )}
                  </h3>
                  {rows.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <Sums worked={total.worked} billable={total.billable} />
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">Keine Einträge</span>
                    </p>
                  )}
                </div>
                {rows.length > 0 && (
                  <ul className="divide-y">
                    {rows.map(({ row, cell }) => (
                      <li key={row.projectId}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto min-h-11 w-full justify-between gap-3 whitespace-normal px-2 py-2 text-left"
                          aria-label={cellLabel(row, cell)}
                          onClick={(event) => onOpenCell(row, cell, event.currentTarget)}
                        >
                          <ProjectLabel row={row} />
                          <span className="shrink-0 font-semibold tabular-nums">{formatDuration(cell.worked)}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        )
      })}
    </div>
  )
}
