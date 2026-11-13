'use client'

import Link from 'next/link'
import { LoadError } from '@/components/customers/load-states'
import { StartButton } from '@/components/timer/start-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepositoryData } from '@/hooks/use-repository-data'
import { getTimeEntriesRepository } from '@/lib/time-entries'

// Liste «Projekt starten»: alle aktiven Projekte, nach Kunde gruppiert, je mit Start-Knopf.
export function ProjectStartList() {
  const { state, retry } = useRepositoryData(() => getTimeEntriesRepository().listTargets(), 'start-list')

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">
        Projekt starten
      </h3>

      {state.status === 'loading' && (
        <div role="status" aria-label="Wird geladen" className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      )}
      {state.status === 'error' && <LoadError onRetry={retry} />}

      {state.status === 'ready' && state.data.length === 0 && (
        <Alert role="note">
          <AlertDescription>
            Lege zuerst einen Kunden an, um einen Timer zu starten.{' '}
            <Link href="/kunden" className="font-medium underline underline-offset-4">
              Zu den Kunden
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {state.status === 'ready' && state.data.length > 0 && (
        <div className="space-y-4">
          {state.data.map((customer) => (
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
        </div>
      )}
    </div>
  )
}
