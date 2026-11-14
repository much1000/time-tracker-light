'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { LoadError } from '@/components/customers/load-states'
import { StartButton } from '@/components/timer/start-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepositoryData } from '@/hooks/use-repository-data'
import { getTimeEntriesRepository, type BookableCustomer } from '@/lib/time-entries'

// Die Wahl «eingeklappt» bleibt in diesem Browser erhalten. Standard: aufgeklappt.
export const START_LIST_STORAGE_KEY = 'tt-start-list-open'

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(START_LIST_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(START_LIST_STORAGE_KEY, open ? '1' : '0')
  } catch {
    // nicht speichern, die Liste funktioniert trotzdem
  }
}

// Liste «Projekt starten»: alle aktiven Projekte, nach Kunde gruppiert, je mit Start-Knopf.
// Einklappbar, damit «Heute» bei vielen Kunden nicht weit nach unten rutscht.
export function ProjectStartList() {
  const { state, retry } = useRepositoryData(() => getTimeEntriesRepository().listTargets(), 'start-list')

  return (
    <div className="space-y-3">
      {state.status === 'loading' && (
        <>
          <h3 className="text-base font-semibold">Projekt starten</h3>
          <div role="status" aria-label="Wird geladen" className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </>
      )}
      {state.status === 'error' && (
        <>
          <h3 className="text-base font-semibold">Projekt starten</h3>
          <LoadError onRetry={retry} />
        </>
      )}

      {state.status === 'ready' && state.data.length === 0 && (
        <>
          <h3 className="text-base font-semibold">Projekt starten</h3>
          <Alert role="note">
            <AlertDescription>
              Lege zuerst einen Kunden an, um einen Timer zu starten.{' '}
              <Link href="/kunden" className="font-medium underline underline-offset-4">
                Zu den Kunden
              </Link>
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Erst nach dem Laden (nur im Browser): Die gemerkte Wahl wird beim ersten Anzeigen gelesen. */}
      {state.status === 'ready' && state.data.length > 0 && <StartListContent customers={state.data} />}
    </div>
  )
}

function StartListContent({ customers }: { customers: BookableCustomer[] }) {
  const [open, setOpen] = useState(readOpen)
  const total = customers.reduce((sum, customer) => sum + customer.projects.length, 0)

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        writeOpen(next)
      }}
    >
      <h3 className="text-base font-semibold">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="-ml-3 h-11 gap-2 px-3 text-base font-semibold">
            Projekt starten ({total})
            <ChevronDown
              className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
      </h3>
      <CollapsibleContent className="space-y-4 pt-3">
        {customers.map((customer) => (
          <div key={customer.id} className="space-y-2">
            <p className="break-words text-sm font-semibold text-muted-foreground">
              <span className="font-mono">{customer.code}</span> · {customer.name}
            </p>
            <ul className="space-y-2">
              {customer.projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-2 pl-3"
                >
                  <span className="min-w-0 break-words font-medium">{project.name}</span>
                  <StartButton
                    projectId={project.id}
                    projectName={project.name}
                    customerCode={customer.code}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
