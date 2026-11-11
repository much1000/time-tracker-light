'use client'

import { ChevronRight, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArchiveSection } from '@/components/customers/archive-section'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { LoadError, LoadingCards } from '@/components/customers/load-states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRepositoryData } from '@/hooks/use-repository-data'
import {
  describeRepositoryError,
  getCustomersRepository,
  type CustomerSummary,
} from '@/lib/customers'

function projectCountLabel(count: number): string {
  if (count === 0) return 'Kein aktives Projekt'
  return count === 1 ? '1 aktives Projekt' : `${count} aktive Projekte`
}

export function CustomerList() {
  const { state, reload, retry } = useRepositoryData(
    () => getCustomersRepository().listCustomers(),
    'list'
  )
  const [creating, setCreating] = useState(false)
  const [reactivating, setReactivating] = useState<string | null>(null)

  async function reactivate(customer: CustomerSummary) {
    if (reactivating) return
    setReactivating(customer.id)
    try {
      await getCustomersRepository().reactivateCustomer(customer.id)
      toast.success(`${customer.code} ist wieder aktiv.`)
      reload()
    } catch (error) {
      toast.error(describeRepositoryError(error).message)
    } finally {
      setReactivating(null)
    }
  }

  const customers = state.status === 'ready' ? state.data : []
  const active = customers.filter((customer) => !customer.archived)
  const archived = customers.filter((customer) => customer.archived)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Kunden</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Neuer Kunde
        </Button>
      </div>

      {state.status === 'loading' && <LoadingCards />}
      {state.status === 'error' && <LoadError onRetry={retry} />}

      {state.status === 'ready' && customers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Noch keine Kunden</h2>
              <p className="text-muted-foreground">
                Lege deinen ersten Kunden an. Das Projekt «Allgemein» entsteht dabei automatisch,
                damit du sofort Zeiten erfassen kannst.
              </p>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Ersten Kunden anlegen
            </Button>
          </CardContent>
        </Card>
      )}

      {state.status === 'ready' && customers.length > 0 && active.length === 0 && (
        <p className="text-muted-foreground">Alle Kunden sind archiviert.</p>
      )}

      {active.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {active.map((customer) => (
            <li key={customer.id} className="min-w-0">
              <Link
                href={`/kunden/${customer.id}`}
                className="block rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Badge variant="outline" className="font-mono">
                        {customer.code}
                      </Badge>
                      <p className="break-words font-semibold">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {projectCountLabel(customer.activeProjectCount)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ArchiveSection count={archived.length}>
        <ul className="space-y-2">
          {archived.map((customer) => (
            <li
              key={customer.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3"
            >
              <Link
                href={`/kunden/${customer.id}`}
                className="min-w-0 flex-1 break-words rounded-sm py-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-mono font-semibold">{customer.code}</span>
                <span className="text-muted-foreground"> · </span>
                {customer.name}
              </Link>
              <Button
                type="button"
                variant="outline"
                disabled={reactivating !== null}
                onClick={() => reactivate(customer)}
                aria-label={`${customer.code} reaktivieren`}
              >
                {reactivating === customer.id ? 'Wird aktiviert …' : 'Reaktivieren'}
              </Button>
            </li>
          ))}
        </ul>
      </ArchiveSection>

      <CustomerFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(customer) => {
          toast.success(`${customer.code} ist angelegt.`)
          reload()
        }}
      />
    </div>
  )
}
