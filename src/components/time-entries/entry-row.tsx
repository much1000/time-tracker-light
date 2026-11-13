'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { TimeEntry } from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'

// Ab dieser Länge wird die Beschreibung gekürzt und lässt sich aufklappen.
const LONG_DESCRIPTION = 160

// Eine Zeile in «Heute»: nur lesen (Bearbeiten und Löschen kommen mit PROJ-5).
export function EntryRow({ entry }: { entry: TimeEntry }) {
  const [expanded, setExpanded] = useState(false)
  const description = entry.description
  const isLong = description !== null && description.length > LONG_DESCRIPTION

  return (
    <li className="space-y-2 rounded-lg border p-3">
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
      {description && (
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
      )}
    </li>
  )
}
