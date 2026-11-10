import { z } from 'zod'

// Mindestlänge für neue Passwörter. Muss mit der Einstellung in Supabase übereinstimmen
// (Authentication → Passwort-Anforderungen), dort gilt die verbindliche Prüfung.
export const PASSWORD_MIN_LENGTH = 10

// Gross-/Kleinschreibung ist egal, Leerzeichen am Rand werden entfernt.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Bitte gib deine E-Mail-Adresse ein.')
  .pipe(z.email('Bitte gib eine gültige E-Mail-Adresse ein.'))

export const loginSchema = z.object({
  email: emailSchema,
  // Beim Anmelden wird das Passwort nicht auf Länge geprüft, nur auf «ausgefüllt».
  // Es wird nicht verändert (keine Leerzeichen entfernen), damit Sonderzeichen erhalten bleiben.
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Bitte gib ein neues Passwort ein.')
    .min(
      PASSWORD_MIN_LENGTH,
      `Das Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`
    ),
})

export type LoginValues = z.infer<typeof loginSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
