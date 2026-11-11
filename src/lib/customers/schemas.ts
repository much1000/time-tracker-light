import { z } from 'zod'

// Grenzen aus dem Spec. Dieselben Grenzen erzwingt später die Datenbank.
export const CODE_MIN_LENGTH = 2
export const CODE_MAX_LENGTH = 10
export const NAME_MAX_LENGTH = 100
export const PROJECT_NUMBER_MAX_LENGTH = 30

// Leerzeichen am Rand fallen weg, das Kürzel wird in Grossbuchstaben gespeichert.
const codeSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib ein Kürzel ein.')
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .min(CODE_MIN_LENGTH, `Das Kürzel braucht mindestens ${CODE_MIN_LENGTH} Zeichen.`)
      .max(CODE_MAX_LENGTH, `Das Kürzel darf höchstens ${CODE_MAX_LENGTH} Zeichen haben.`)
      .regex(/^[A-Z0-9-]+$/, 'Erlaubt sind Buchstaben (ohne Umlaute), Ziffern und Bindestrich.')
  )

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib einen Namen ein.')
  .max(NAME_MAX_LENGTH, `Der Name darf höchstens ${NAME_MAX_LENGTH} Zeichen haben.`)

// Leer bedeutet «keine Projektnummer».
const projectNumberSchema = z
  .string()
  .trim()
  .max(
    PROJECT_NUMBER_MAX_LENGTH,
    `Die Projektnummer darf höchstens ${PROJECT_NUMBER_MAX_LENGTH} Zeichen haben.`
  )

export const customerSchema = z.object({
  code: codeSchema,
  name: nameSchema,
})

export const projectSchema = z.object({
  name: nameSchema,
  number: projectNumberSchema,
})

// Eingabe im Formular (vor der Bereinigung) und bereinigte Werte (nach der Prüfung).
export type CustomerFormValues = z.input<typeof customerSchema>
export type CustomerValues = z.output<typeof customerSchema>
export type ProjectFormValues = z.input<typeof projectSchema>
export type ProjectValues = z.output<typeof projectSchema>
