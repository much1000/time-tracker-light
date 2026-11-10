import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuthNoticeProps {
  tone: 'error' | 'success'
  children: ReactNode
}

// Meldung am Formular. Zustand nie nur über Farbe: immer Symbol und Text.
export function AuthNotice({ tone, children }: AuthNoticeProps) {
  if (tone === 'success') {
    return (
      <Alert role="status">
        <CheckCircle2 className="h-4 w-4 !text-success" aria-hidden="true" />
        <AlertDescription>{children}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive" role="alert">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
