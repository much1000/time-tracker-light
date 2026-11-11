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
import { describeRepositoryError, getCustomersRepository, type Project } from '@/lib/customers'
import {
  projectSchema,
  type ProjectFormValues,
  type ProjectValues,
} from '@/lib/customers/schemas'

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  // Ohne Projekt: neu anlegen. Mit Projekt: bearbeiten.
  project?: Project
  onSaved: (project: Project) => void
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  customerId,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const editing = Boolean(project)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Projekt bearbeiten' : 'Neues Projekt'}
      description={
        editing
          ? 'Änderungen gelten überall, auch für bereits erfasste Zeiten.'
          : 'Das Projekt gehört zu diesem Kunden.'
      }
    >
      <ProjectForm
        customerId={customerId}
        project={project}
        onCancel={() => onOpenChange(false)}
        onSaved={(saved) => {
          onOpenChange(false)
          onSaved(saved)
        }}
      />
    </ResponsiveDialog>
  )
}

function ProjectForm({
  customerId,
  project,
  onCancel,
  onSaved,
}: {
  customerId: string
  project?: Project
  onCancel: () => void
  onSaved: (project: Project) => void
}) {
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<ProjectFormValues, unknown, ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: project?.name ?? '', number: project?.number ?? '' },
  })
  const busy = form.formState.isSubmitting

  async function onSubmit(values: ProjectValues) {
    if (busy) return
    setFailure(null)
    try {
      const repository = getCustomersRepository()
      const saved = project
        ? await repository.updateProject(project.id, values)
        : await repository.createProject(customerId, values)
      onSaved(saved)
    } catch (error) {
      const described = describeRepositoryError(error)
      if (described.field === 'name') {
        form.setError('name', { message: described.message })
        form.setFocus('name')
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} autoFocus autoComplete="off" className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Projektnummer (optional)</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" autoCorrect="off" className="h-11" />
              </FormControl>
              <FormDescription>Freier Text, höchstens 30 Zeichen.</FormDescription>
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
