'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AuthNotice } from '@/components/auth/auth-notice'
import { ResponsiveDialog } from '@/components/customers/responsive-dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { describeRepositoryError, getCustomersRepository, type Customer } from '@/lib/customers'
import {
  CODE_MAX_LENGTH,
  customerSchema,
  type CustomerFormValues,
  type CustomerValues,
} from '@/lib/customers/schemas'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Ohne Kunde: neu anlegen. Mit Kunde: bearbeiten.
  customer?: Customer
  onSaved: (customer: Customer) => void
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: CustomerFormDialogProps) {
  const editing = Boolean(customer)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Kunde bearbeiten' : 'Neuer Kunde'}
      description={
        editing
          ? 'Änderungen gelten überall, auch für bereits erfasste Zeiten.'
          : 'Zum Kunden wird automatisch das Projekt «Allgemein» angelegt.'
      }
    >
      <CustomerForm
        customer={customer}
        onCancel={() => onOpenChange(false)}
        onSaved={(saved) => {
          onOpenChange(false)
          onSaved(saved)
        }}
      />
    </ResponsiveDialog>
  )
}

function CustomerForm({
  customer,
  onCancel,
  onSaved,
}: {
  customer?: Customer
  onCancel: () => void
  onSaved: (customer: Customer) => void
}) {
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<CustomerFormValues, unknown, CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { code: customer?.code ?? '', name: customer?.name ?? '' },
  })
  const busy = form.formState.isSubmitting

  async function onSubmit(values: CustomerValues) {
    if (busy) return
    setFailure(null)
    try {
      const repository = getCustomersRepository()
      const saved = customer
        ? await repository.updateCustomer(customer.id, values)
        : await repository.createCustomer(values)
      onSaved(saved)
    } catch (error) {
      const described = describeRepositoryError(error)
      if (described.field) {
        form.setError(described.field, { message: described.message })
        form.setFocus(described.field)
      } else {
        setFailure(described.message)
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {failure && <AuthNotice tone="error">{failure}</AuthNotice>}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kürzel</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={CODE_MAX_LENGTH + 5}
                  className="h-11 uppercase"
                />
              </FormControl>
              <FormDescription>
                2 bis {CODE_MAX_LENGTH} Zeichen: Buchstaben, Ziffern, Bindestrich. Beispiel: MUS
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                Wird gespeichert …
              </>
            ) : (
              'Speichern'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
