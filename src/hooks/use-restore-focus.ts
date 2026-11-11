import { useState } from 'react'

// Gibt den Tastaturfokus nach dem Schliessen eines Dialogs oder Blatts an das Element zurück,
// das beim Öffnen den Fokus hatte (Radix tut das nur bei einem eigenen Auslöser-Knopf, unsere
// Dialoge werden aber über Zustand geöffnet). Das Element wird beim Öffnen gemerkt, noch bevor
// der Dialog den Fokus in sich hineinzieht.
export function useRestoreFocus(open: boolean) {
  const [wasOpen, setWasOpen] = useState(open)
  const [opener, setOpener] = useState<HTMLElement | null>(null)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    }
  }

  return (event: Event) => {
    if (opener && opener.isConnected && opener !== document.body) {
      event.preventDefault()
      opener.focus()
    }
  }
}
