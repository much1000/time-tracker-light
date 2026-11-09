'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

// Setzt das Theme vor dem ersten Anzeigen (kein Aufblitzen) und merkt sich
// die Wahl im Browser des Geräts. Ohne Wahl gilt die Geräteeinstellung.
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
