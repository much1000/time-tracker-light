import { z } from 'zod'

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ error: 'fehlt' })
    .min(1, 'fehlt')
    .pipe(z.url({ error: 'ist keine gültige URL' })),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ error: 'fehlt' })
    .min(1, 'fehlt'),
  // Darf nie existieren: Ein NEXT_PUBLIC_-Präfix würde den Vollzugriffs-Schlüssel an den Browser ausliefern.
  NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: z
    .undefined({
      error: 'darf nicht gesetzt sein (Service-Role-Schlüssel gehört nie in den Browser)',
    })
    .optional(),
})

export type SupabaseEnv = {
  url: string
  anonKey: string
}

export class EnvError extends Error {
  readonly variables: string[]

  constructor(variables: string[], message: string) {
    super(message)
    this.name = 'EnvError'
    this.variables = variables
  }
}

// Die Variablen müssen einzeln und namentlich gelesen werden,
// sonst ersetzt Next.js sie im Browser-Bundle nicht.
function readRawEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function getSupabaseEnv(raw: Record<string, string | undefined> = readRawEnv()): SupabaseEnv {
  const result = supabaseEnvSchema.safeParse(raw)

  if (!result.success) {
    const problems = result.error.issues.map((issue) => ({
      name: String(issue.path[0]),
      reason: issue.message,
    }))
    const message = problems
      .map((problem) => `${problem.name}: ${problem.reason}`)
      .join('; ')

    throw new EnvError(
      problems.map((problem) => problem.name),
      `Ungültige Konfiguration. ${message}`
    )
  }

  return {
    url: result.data.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}
