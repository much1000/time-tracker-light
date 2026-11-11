'use client'

import { LoaderCircle, LogOut } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  // «labeled»: Symbol mit Text (Seitenleiste), «icon»: nur Symbol (Kopfzeile am Handy)
  variant?: 'labeled' | 'icon'
  className?: string
}

export function LogoutButton({ variant = 'labeled', className }: LogoutButtonProps) {
  const [busy, setBusy] = useState(false)

  async function logout() {
    if (busy) return
    setBusy(true)
    try {
      const { error } = await createClient().auth.signOut({ scope: 'local' })
      if (error) throw error
      window.location.href = '/login'
    } catch {
      setBusy(false)
      toast.error('Abmelden war nicht möglich. Bitte versuche es erneut.')
    }
  }

  const Icon = busy ? LoaderCircle : LogOut

  return (
    <Button
      type="button"
      variant="outline"
      size={variant === 'icon' ? 'icon' : 'default'}
      className={cn(variant === 'labeled' && 'w-full justify-start', className)}
      onClick={logout}
      disabled={busy}
      aria-label={variant === 'icon' ? 'Abmelden' : undefined}
    >
      <Icon className={busy ? 'animate-spin' : undefined} aria-hidden="true" />
      {variant === 'labeled' && <span>{busy ? 'Abmelden …' : 'Abmelden'}</span>}
    </Button>
  )
}
