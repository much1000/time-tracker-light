'use client'

import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArchiveSection } from '@/components/customers/archive-section'
import { ConfirmArchiveDialog } from '@/components/customers/confirm-archive-dialog'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { LoadError, LoadingCards } from '@/components/customers/load-states'
import { ProjectFormDialog } from '@/components/customers/project-form-dialog'
import { StartButton } from '@/components/timer/start-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRepositoryData } from '@/hooks/use-repository-data'
import {
  describeRepositoryError,
  getCustomersRepository,
  type Customer,
  type CustomerWithProjects,
  type Project,
} from '@/lib/customers'

type Confirm = { kind: 'customer' } | { kind: 'project'; project: Project }

function BackLink() {
  return (
    <Button asChild variant="link" className="-ml-4">
      <Link href="/kunden">
        <ArrowLeft aria-hidden="true" />
        Alle Kunden
      </Link>
    </Button>
  )
}

export function CustomerDetail({ customerId }: { customerId: string }) {
  const { state, reload, retry } = useRepositoryData(
    () => getCustomersRepository().getCustomer(customerId),
    customerId
  )

  // Titel der Seite: «<Kürzel> · Time Tracker Light» (Muster aus dem Wurzel-Layout).
  const customer = state.status === 'ready' ? state.data?.customer : undefined
  useEffect(() => {
    if (customer) document.title = `${customer.code} · Time Tracker Light`
  }, [customer])

  if (state.status === 'loading') {
    return (
      <div className="space-y-6">
        <BackLink />
        <LoadingCards count={2} />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="space-y-6">
        <BackLink />
        <LoadError onRetry={retry} />
      </div>
    )
  }
  if (state.data === null) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Card>
          <CardContent className="space-y-2 pt-6">
            <h1 className="text-2xl font-bold tracking-tight">Kunde nicht gefunden</h1>
            <p className="text-muted-foreground">
              Diesen Kunden gibt es nicht, oder er gehört nicht zu deinem Konto.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <CustomerDetailView data={state.data} reload={reload} />
}

function CustomerDetailView({
  data,
  reload,
}: {
  data: CustomerWithProjects
  reload: () => void
}) {
  const { customer, projects } = data
  const activeProjects = projects.filter((project) => !project.archived)
  const archivedProjects = projects.filter((project) => project.archived)

  const [editingCustomer, setEditingCustomer] = useState(false)
  const [projectDialog, setProjectDialog] = useState<{ project?: Project } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>, success: string) {
    if (busy) return
    setBusy(true)
    try {
      await action()
      toast.success(success)
      setConfirm(null)
      reload()
    } catch (error) {
      toast.error(describeRepositoryError(error).message)
    } finally {
      setBusy(false)
    }
  }

  const repository = getCustomersRepository()

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="space-y-4">
        <div className="space-y-1">
          <p className="font-mono text-sm font-semibold text-muted-foreground">{customer.code}</p>
          <h1 className="break-words text-2xl font-bold tracking-tight">{customer.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {customer.archived ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                run(() => repository.reactivateCustomer(customer.id), `${customer.code} ist wieder aktiv.`)
              }
            >
              Reaktivieren
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setEditingCustomer(true)}>
                <Pencil aria-hidden="true" />
                Bearbeiten
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirm({ kind: 'customer' })}>
                Archivieren
              </Button>
            </>
          )}
        </div>
      </div>

      {customer.archived && (
        <Alert role="note">
          <AlertDescription>
            Dieser Kunde ist archiviert. Reaktiviere ihn, um Projekte zu bearbeiten oder neue
            anzulegen. Erfasste Zeiten bleiben erhalten.
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="projects-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="projects-heading" className="text-lg font-semibold">
            Projekte
          </h2>
          {!customer.archived && (
            <Button type="button" onClick={() => setProjectDialog({})}>
              <Plus aria-hidden="true" />
              Neues Projekt
            </Button>
          )}
        </div>

        {activeProjects.length === 0 && !customer.archived && (
          <Alert role="note">
            <AlertDescription>
              Lege ein Projekt an, um Zeiten zu erfassen.
            </AlertDescription>
          </Alert>
        )}

        {activeProjects.length > 0 && (
          <ul className="space-y-2">
            {activeProjects.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <ProjectLabel project={project} />
                {!customer.archived && (
                  <div className="flex flex-wrap gap-2">
                    <StartButton
                      projectId={project.id}
                      projectName={project.name}
                      customerCode={customer.code}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProjectDialog({ project })}
                      aria-label={`${project.name} bearbeiten`}
                    >
                      <Pencil aria-hidden="true" />
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirm({ kind: 'project', project })}
                      aria-label={`${project.name} archivieren`}
                    >
                      Archivieren
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <ArchiveSection count={archivedProjects.length}>
          {customer.archived && (
            <p className="text-sm text-muted-foreground">
              Reaktiviere zuerst den Kunden. Dann werden die Projekte wieder aktiv, die mit ihm
              archiviert wurden.
            </p>
          )}
          <ul className="space-y-2">
            {archivedProjects.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <ProjectLabel project={project} />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || customer.archived}
                  onClick={() =>
                    run(() => repository.reactivateProject(project.id), `${project.name} ist wieder aktiv.`)
                  }
                  aria-label={`${project.name} reaktivieren`}
                >
                  Reaktivieren
                </Button>
              </li>
            ))}
          </ul>
        </ArchiveSection>
      </section>

      <CustomerFormDialog
        open={editingCustomer}
        onOpenChange={setEditingCustomer}
        customer={customer}
        onSaved={(saved: Customer) => {
          toast.success(`${saved.code} ist gespeichert.`)
          reload()
        }}
      />
      <ProjectFormDialog
        open={projectDialog !== null}
        onOpenChange={(open) => !open && setProjectDialog(null)}
        customerId={customer.id}
        project={projectDialog?.project}
        onSaved={(saved) => {
          toast.success(`${saved.name} ist gespeichert.`)
          reload()
        }}
      />
      <ConfirmArchiveDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        busy={busy}
        title={
          confirm?.kind === 'project'
            ? `Projekt «${confirm.project.name}» archivieren?`
            : `Kunde «${customer.code}» archivieren?`
        }
        description={
          confirm?.kind === 'project'
            ? 'Das Projekt erscheint nicht mehr bei neuen Zeiten und im Timer. Erfasste Zeiten bleiben erhalten. Du kannst es jederzeit reaktivieren.'
            : 'Der Kunde und alle seine aktiven Projekte erscheinen nicht mehr bei neuen Zeiten und im Timer. Erfasste Zeiten bleiben erhalten. Beim Reaktivieren des Kunden werden nur die Projekte wieder aktiv, die jetzt mit ihm archiviert werden.'
        }
        onConfirm={() => {
          if (!confirm) return
          if (confirm.kind === 'project') {
            const { project } = confirm
            void run(() => repository.archiveProject(project.id), `${project.name} ist archiviert.`)
          } else {
            void run(() => repository.archiveCustomer(customer.id), `${customer.code} ist archiviert.`)
          }
        }}
      />
    </div>
  )
}

function ProjectLabel({ project }: { project: Project }) {
  return (
    <div className="min-w-0 space-y-0.5 sm:flex-1">
      <p className="break-words font-medium">{project.name}</p>
      {project.number && (
        <p className="break-words text-sm text-muted-foreground">Nr. {project.number}</p>
      )}
    </div>
  )
}
