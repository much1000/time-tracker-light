import { Brand } from '@/components/brand'
import { ThemeSwitch } from '@/components/theme-switch'

// Kopfzeile nur auf dem Handy: Logo mit Name und Theme-Schalter.
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
      <Brand />
      <ThemeSwitch variant="icon" />
    </header>
  )
}
