'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AuthNotice } from '@/components/auth/auth-notice'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { describeAuthError } from '@/lib/auth/errors'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/lib/auth/schemas'
import { createClient } from '@/lib/supabase/client'

interface ForgotPasswordFormProps {
  // Der Link aus der Mail war abgelaufen, schon benutzt oder ungültig.
  linkInvalid?: boolean
}

export const SENT_MESSAGE =
  'Falls ein Konto existiert, haben wir eine E-Mail gesendet.'

export function ForgotPasswordForm({ linkInvalid = false }: ForgotPasswordFormProps) {
  const [failure, setFailure] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  const busy = form.formState.isSubmitting

  async function onSubmit(values: ForgotPasswordValues) {
    if (busy) return
    setFailure(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        // Der Link in der Mail führt auf unsere Seite, die ihn einlöst (siehe Tech Design).
        redirectTo: `${window.location.origin}/auth/bestaetigen?next=/passwort-neu`,
      })
      if (error) throw error
      setSent(true)
    } catch (error) {
      const result = describeAuthError(error)
      // Unbekannte Adressen dürfen nicht auffallen: gleiche Antwort wie bei Erfolg.
      if (result.kind === 'invalid-credentials') {
        setSent(true)
        return
      }
      setFailure(result.message)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <AuthNotice tone="success">{SENT_MESSAGE}</AuthNotice>
        <p className="text-center">
          <Button asChild variant="link">
            <Link href="/login">Zurück zur Anmeldung</Link>
          </Button>
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {linkInvalid && (
          <AuthNotice tone="error">
            Dieser Link ist nicht mehr gültig. Fordere unten einen neuen an.
          </AuthNotice>
        )}
        {failure && <AuthNotice tone="error">{failure}</AuthNotice>}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Wird gesendet …
            </>
          ) : (
            'Link senden'
          )}
        </Button>
        <p className="text-center">
          <Button asChild variant="link">
            <Link href="/login">Zurück zur Anmeldung</Link>
          </Button>
        </p>
      </form>
    </Form>
  )
}
