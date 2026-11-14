'use client'

import { FileText, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TimeEntry } from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'

// Ab dieser Länge wird die Beschreibung gekürzt und lässt sich aufklappen.
const LONG_DESCRIPTION = 160

// «2026-11-13» -> «13.11.»
function shortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}.${month}.`
}

// Eindeutiger Name für Screenreader: «Eintrag von 13.11., MUS · Allgemein, 1:30»
export function entryLabel(entry: TimeEntry): string {
  return `Eintrag von ${shortDate(entry.date)}, ${entry.customerCode} · ${entry.projectName}, ${formatDuration(entry.durationMinutes)}`
}

interface EntryRowProps {
  entry: TimeEntry
  onEdit?: (entry: TimeEntry) => void
  onDelete?: (entry: TimeEntry) => void
}

// Eine Zeile in «Heute» und auf der Seite «Zeiten», mit den Aktionen «Bearbeiten» und «Löschen».
export function EntryRow({ entry, onEdit, onDelete }: EntryRowProps) {
  const [expanded, setExpanded] = useState(false)
  const description = entry.description
  const isLong = description !== null && description.length > LONG_DESCRIPTION
  const label = entryLabel(entry)

  return (
    <li data-entry-id={entry.id} className="space-y-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="break-words font-medium">
            <span className="font-mono text-sm text-muted-foreground">{entry.customerCode}</span>
            <span className="text-muted-foreground"> · </span>
            {entry.projectName}
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
      {description ? (
        <div>
          <p
            className={`whitespace-pre-line break-words text-sm ${isLong && !expanded ? 'line-clamp-3' : ''}`}
          >
            {description}
          </p>
          {isLong && (
            <Button
              type="button"
              variant="link"
              className="-ml-4 h-11"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
            </Button>
          )}
        </div>
      ) : (
        <Badge variant="outline" className="gap-1 font-normal">
          <FileText className="h-3 w-3" aria-hidden="true" />
          Keine Beschreibung
        </Badge>
      )}
      {(onEdit || onDelete) && (
        <div className="flex flex-wrap gap-2">
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              aria-label={`${label} bearbeiten`}
              onClick={() => onEdit(entry)}
            >
              <Pencil aria-hidden="true" />
              Bearbeiten
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              aria-label={`${label} löschen`}
              onClick={() => onDelete(entry)}
            >
              <Trash2 aria-hidden="true" />
              Löschen
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
