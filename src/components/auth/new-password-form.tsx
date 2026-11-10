'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AuthNotice } from '@/components/auth/auth-notice'
import { PasswordInput } from '@/components/auth/password-input'
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
import { describeAuthError } from '@/lib/auth/errors'
import {
  newPasswordSchema,
  PASSWORD_MIN_LENGTH,
  type NewPasswordValues,
} from '@/lib/auth/schemas'
import { createClient } from '@/lib/supabase/client'

export function NewPasswordForm() {
  const [failure, setFailure] = useState<{ message: string; linkInvalid: boolean } | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '' },
  })
  const busy = form.formState.isSubmitting || redirecting

  async function onSubmit(values: NewPasswordValues) {
    if (busy) return
    setFailure(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw error
      // Nach dem Setzen ist der Nutzer angemeldet und landet auf der Startseite.
      setRedirecting(true)
      window.location.href = '/'
    } catch (error) {
      setRedirecting(false)
      const result = describeAuthError(error)
      setFailure({ message: result.message, linkInvalid: result.kind === 'link-invalid' })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {failure && (
          <AuthNotice tone="error">
            {failure.message}
            {failure.linkInvalid && (
              <>
                {' '}
                <Link href="/passwort-vergessen" className="font-medium underline">
                  Neuen Link anfordern
                </Link>
              </>
            )}
          </AuthNotice>
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Neues Passwort</FormLabel>
              <FormControl>
                <PasswordInput {...field} autoComplete="new-password" />
              </FormControl>
              <FormDescription>
                Mindestens {PASSWORD_MIN_LENGTH} Zeichen.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Wird gespeichert …
            </>
          ) : (
            'Passwort speichern'
          )}
        </Button>
      </form>
    </Form>
  )
}
