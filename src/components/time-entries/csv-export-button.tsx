'use client'

import { Download, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { describeTimeEntryError, getTimeEntriesRepository } from '@/lib/time-entries'
import { csvFileName, entriesToCsv } from '@/lib/time-entries/csv'
import { loadAllEntries } from '@/lib/time-entries/export-all'
import { todayInZurich } from '@/lib/time-entries/zurich'

// Lädt die Datei im Browser herunter (temporärer Link auf die erzeugten Daten)
function downloadCsv(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Der Download hat begonnen; die Adresse kann kurz danach freigegeben werden
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Knopf «Als CSV exportieren» auf der Seite «Zeiten» (PROJ-9): alle Zeiten, immer alle, ohne Filter.
// Lädt Block für Block, prüft die Vollständigkeit und liefert nie eine halbe Datei.
export function CsvExportButton() {
  const [running, setRunning] = useState(false)
  // Sperre gegen Doppelklick, auch bevor der Zustand neu gezeichnet ist
  const busy = useRef(false)

  async function run() {
    if (busy.current) return
    busy.current = true
    setRunning(true)
    try {
      const entries = await loadAllEntries(getTimeEntriesRepository())
      if (entries.length === 0) {
        toast.error('Keine Zeiten vorhanden.')
        return
      }
      downloadCsv(entriesToCsv(entries), csvFileName(todayInZurich()))
      toast.success(entries.length === 1 ? '1 Zeile exportiert.' : `${entries.length} Zeilen exportiert.`)
    } catch (error) {
      toast.error(describeTimeEntryError(error))
    } finally {
      busy.current = false
      setRunning(false)
    }
  }

  return (
    // Nicht «disabled»: Ein gesperrter Knopf verliert den Fokus. «aria-disabled» hält den Fokus (Tastatur,
    // Screenreader); Klicks während des Exports ignoriert die Sperre in run().
    <Button
      type="button"
      variant="outline"
      onClick={run}
      aria-disabled={running}
      aria-busy={running}
      className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    >
      {running ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
      {running ? 'Wird exportiert …' : 'Als CSV exportieren'}
    </Button>
  )
}
