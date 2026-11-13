'use client'

import { LoaderCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useRestoreFocus } from '@/hooks/use-restore-focus'

interface ConfirmArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  busy: boolean
  onConfirm: () => void
  // Beschriftung des Bestätigen-Knopfs (Standard: Archivieren), auch für andere Rückfragen nutzbar
  confirmLabel?: string
  busyLabel?: string
}

// Rückfrage vor dem Archivieren. Archivieren ist umkehrbar und löscht nichts,
// deshalb ist der Bestätigen-Knopf kein roter Löschen-Knopf.
export function ConfirmArchiveDialog({
  open,
  onOpenChange,
  title,
  description,
  busy,
  onConfirm,
  confirmLabel = 'Archivieren',
  busyLabel = 'Wird archiviert …',
}: ConfirmArchiveDialogProps) {
  const restoreFocus = useRestoreFocus(open)
  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent onCloseAutoFocus={restoreFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
          {/* Kein AlertDialogAction: Der Dialog bleibt bis zum Ende der Anfrage offen. */}
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                {busyLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
