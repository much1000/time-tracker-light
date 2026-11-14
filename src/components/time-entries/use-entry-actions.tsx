'use client'

import { useRef, useState, type RefObject } from 'react'
import { toast } from 'sonner'
import { ConfirmArchiveDialog } from '@/components/customers/confirm-archive-dialog'
import { TimeEntryFormDialog } from '@/components/time-entries/time-entry-form-dialog'
import {
  describeTimeEntryError,
  getTimeEntriesRepository,
  TimeEntryError,
  type TimeEntry,
} from '@/lib/time-entries'
import { formatDuration } from '@/lib/time-entries/duration'
import { formatDate } from '@/lib/time-entries/zurich'

interface UseEntryActionsOptions {
  // Etwas hat sich geändert (gespeichert, gelöscht oder der Eintrag gab es nicht mehr): Liste neu laden.
  onChanged: () => void
  // Umgebung der Einträge (für die Fokus-Rückgabe) und das Element, das den Fokus erhält, wenn kein Eintrag bleibt.
  containerRef: RefObject<HTMLElement | null>
  fallbackRef: RefObject<HTMLElement | null>
  // Bleibt ein gespeicherter Eintrag in der Ansicht sichtbar? (nein: zum Beispiel anderer Monat)
  isVisible?: (entry: TimeEntry) => boolean
}

const MAX_PREVIEW = 80

function preview(text: string | null): string {
  if (!text) return 'ohne Beschreibung'
  const flat = text.replace(/\s+/g, ' ')
  return `«${flat.length > MAX_PREVIEW ? `${flat.slice(0, MAX_PREVIEW)} …` : flat}»`
}

// Bearbeiten und Löschen von Einträgen, gemeinsam für «Heute» und die Seite «Zeiten».
// Gibt die Handler für die Eintragszeilen und die Dialoge zurück, die die Ansicht einmal einbindet.
export function useEntryActions({ onChanged, containerRef, fallbackRef, isVisible }: UseEntryActionsOptions) {
  // Der Eintrag wird mit dem Dialog zusammen gemerkt, damit Titel und Inhalt beim Schliessen nicht umspringen.
  const [editing, setEditing] = useState<{ entry: TimeEntry; open: boolean } | null>(null)
  const [deleting, setDeleting] = useState<{ entry: TimeEntry; open: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  // Nach dem Entfernen eines Eintrags: Fokus zum nächsten sinnvollen Element
  const focusAfterRemoval = useRef<string | null | undefined>(undefined)

  // Nächster (sonst vorheriger) Eintrag in der Ansicht, sonst null
  function neighbourOf(entryId: string): string | null {
    const items = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-entry-id]') ?? [])
    const index = items.findIndex((item) => item.dataset.entryId === entryId)
    if (index === -1) return null
    return (items[index + 1] ?? items[index - 1])?.dataset.entryId ?? null
  }

  // Wird beim Schliessen des Dialogs aufgerufen: gibt true zurück, wenn der Fokus hier gesetzt wurde
  function restoreAfterRemoval(event: Event): boolean {
    if (focusAfterRemoval.current === undefined) return false
    const neighbourId = focusAfterRemoval.current
    focusAfterRemoval.current = undefined
    event.preventDefault()
    const target = neighbourId
      ? containerRef.current?.querySelector<HTMLElement>(`[data-entry-id="${neighbourId}"] button`)
      : null
    ;(target ?? fallbackRef.current)?.focus()
    return true
  }

  function handleSaved(original: TimeEntry, saved: TimeEntry) {
    toast.success(saved.date === original.date ? 'Änderung gespeichert.' : `Gespeichert am ${formatDate(saved.date)}.`)
    if (isVisible && !isVisible(saved)) focusAfterRemoval.current = neighbourOf(original.id)
    onChanged()
  }

  async function confirmDelete(entry: TimeEntry) {
    if (busy) return
    setBusy(true)
    try {
      await getTimeEntriesRepository().deleteEntry(entry.id)
      focusAfterRemoval.current = neighbourOf(entry.id)
      toast.success('Eintrag gelöscht.')
      setDeleting((current) => (current ? { ...current, open: false } : current))
      onChanged()
    } catch (error) {
      toast.error(describeTimeEntryError(error))
      if (error instanceof TimeEntryError && error.kind === 'entry-not-found') {
        // Auf einem anderen Gerät gelöscht: Rückfrage schliessen, Liste neu laden
        focusAfterRemoval.current = neighbourOf(entry.id)
        setDeleting((current) => (current ? { ...current, open: false } : current))
        onChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  const dialogs = (
    <>
      {editing && (
        <TimeEntryFormDialog
          open={editing.open}
          onOpenChange={(open) => setEditing((current) => (current ? { ...current, open } : current))}
          entry={editing.entry}
          onSaved={(saved) => handleSaved(editing.entry, saved)}
          onEntryGone={() => {
            focusAfterRemoval.current = neighbourOf(editing.entry.id)
            onChanged()
          }}
          onCloseFocus={restoreAfterRemoval}
        />
      )}
      {deleting && (
        <ConfirmArchiveDialog
          open={deleting.open}
          onOpenChange={(open) => setDeleting((current) => (current ? { ...current, open } : current))}
          title="Eintrag löschen?"
          description={`${deleting.entry.customerCode} · ${deleting.entry.projectName}, ${formatDate(deleting.entry.date)}, ${formatDuration(deleting.entry.durationMinutes)}, ${preview(deleting.entry.description)}. Das Löschen ist endgültig und lässt sich nicht rückgängig machen.`}
          busy={busy}
          confirmLabel="Löschen"
          busyLabel="Wird gelöscht …"
          destructive
          onConfirm={() => confirmDelete(deleting.entry)}
          onCloseFocus={restoreAfterRemoval}
        />
      )}
    </>
  )

  return {
    onEdit: (entry: TimeEntry) => setEditing({ entry, open: true }),
    onDelete: (entry: TimeEntry) => setDeleting({ entry, open: true }),
    dialogs,
  }
}
