'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ThemeSwitchProps {
  // «labeled»: Symbol mit Text (Seitenleiste), «icon»: nur Symbol (Kopfzeile am Handy)
  variant?: 'labeled' | 'icon'
  className?: string
}

const options = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Hell', icon: Sun },
  { value: 'dark', label: 'Dunkel', icon: Moon },
] as const

export function ThemeSwitch({ variant = 'labeled', className }: ThemeSwitchProps) {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === 'icon' ? 'icon' : 'default'}
          className={cn(variant === 'labeled' && 'w-full justify-start', className)}
          aria-label={variant === 'icon' ? 'Darstellung wählen' : undefined}
        >
          {/* Beide Symbole liegen im Dokument, das Stylesheet blendet eines aus:
              so gibt es vor dem Laden des Themes keinen Unterschied zwischen Server und Browser. */}
          <span className="relative inline-flex h-4 w-4" aria-hidden="true">
            <Sun className="absolute h-4 w-4 dark:hidden" />
            <Moon className="absolute hidden h-4 w-4 dark:block" />
          </span>
          {variant === 'labeled' && <span>Darstellung</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup
          value={theme ?? 'system'}
          onValueChange={setTheme}
          aria-label="Darstellung"
        >
          {options.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="min-h-11">
              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
