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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { describeAuthError } from '@/lib/auth/errors'
import { getSafeRedirect } from '@/lib/auth/redirect'
import { loginSchema, type LoginValues } from '@/lib/auth/schemas'
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  // Gewünschte Zieladresse aus der Umleitung. Wird hier nochmals geprüft.
  next?: string
}

export function LoginForm({ next }: LoginFormProps) {
  const [failure, setFailure] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const busy = form.formState.isSubmitting || redirecting

  async function onSubmit(values: LoginValues) {
    if (busy) return
    setFailure(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error || !data.session) {
        throw error ?? { code: 'invalid_credentials' }
      }
      // Der Knopf bleibt bis zum Seitenwechsel gesperrt (kein Doppelklick).
      setRedirecting(true)
      window.location.href = getSafeRedirect(next)
    } catch (error) {
      setRedirecting(false)
      setFailure(describeAuthError(error).message)
      // E-Mail bleibt stehen, das Passwort wird geleert.
      form.resetField('password', { defaultValue: '' })
      form.setFocus('password')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
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
                  autoComplete="username"
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort</FormLabel>
              <FormControl>
                <PasswordInput {...field} autoComplete="current-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Anmelden …
            </>
          ) : (
            'Anmelden'
          )}
        </Button>
        <p className="text-center">
          <Button asChild variant="link">
            <Link href="/passwort-vergessen">Passwort vergessen?</Link>
          </Button>
        </p>
      </form>
    </Form>
  )
}
