'use client'

import { useState, type RefObject } from 'react'
import { ResponsiveDialog } from '@/components/customers/responsive-dialog'
import { EntryRow } from '@/components/time-entries/entry-row'
import type { TimeEntry } from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'
import type { WeekCell, WeekRow } from '@/lib/time-entries/week-summary'
import { formatLongDate } from '@/lib/time-entries/zurich'

export interface CellSelection {
  row: WeekRow
  cell: WeekCell
}

interface WeekCellDialogProps {
  // Gewählte Zelle mit ihren aktuellen Einträgen; null = nichts gewählt oder Zelle ist leer geworden
  selection: CellSelection | null
  onClose: () => void
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
  listRef: RefObject<HTMLUListElement | null>
  onCloseFocus: (event: Event) => boolean
}

// Detail einer Zelle (Projekt an einem Tag): alle Einträge mit Beschreibung, Bearbeiten und Löschen.
// Dialog am Laptop, Blatt von unten am Handy. Der Dialog bleibt immer eingehängt und öffnet sich über «open»,
// damit die Fokus-Rückgabe zum auslösenden Knopf funktioniert.
export function WeekCellDialog({ selection, onClose, onEdit, onDelete, listRef, onCloseFocus }: WeekCellDialogProps) {
  // Beim Schliessen (auch wenn die Zelle leer wird) bleiben Titel und Inhalt für die Ausblend-Animation stehen
  const [snapshot, setSnapshot] = useState<CellSelection | null>(selection)
  if (selection && selection.cell !== snapshot?.cell) setSnapshot(selection)
  const shown = selection ?? snapshot

  return (
    <ResponsiveDialog
      open={selection !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={shown ? `${shown.row.customerCode} · ${shown.row.projectName}, ${formatLongDate(shown.cell.date)}` : 'Einträge'}
      description={
        shown
          ? `${formatDuration(shown.cell.worked)} gearbeitet · ${formatDuration(shown.cell.billable)} verrechenbar`
          : 'Einträge dieser Zelle'
      }
      onCloseFocus={onCloseFocus}
    >
      {shown && (
        <ul ref={listRef} className="space-y-2">
          {shown.cell.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  )
}
