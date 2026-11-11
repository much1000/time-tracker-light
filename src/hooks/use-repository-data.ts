'use client'

import { useCallback, useEffect, useState } from 'react'

export type RepositoryDataState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: T }

// Lädt Daten aus der Datenschicht. Beim erneuten Laden (nach dem Speichern) bleiben die
// alten Daten stehen, bis die neuen da sind, damit die Seite nicht flackert.
export function useRepositoryData<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<RepositoryDataState<T>>({ status: 'loading' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data })
      },
      () => {
        if (!cancelled) setState({ status: 'error' })
      }
    )
    return () => {
      cancelled = true
    }
    // «key» steht für alles, was die Abfrage ändert (zum Beispiel die Kunden-ID).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setVersion((current) => current + 1)
  }, [])

  return { state, reload, retry }
}
