import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UNREACHABLE_MESSAGE } from '@/lib/supabase/health'
import { DatabaseStatus } from './database-status'

describe('DatabaseStatus', () => {
  it('zeigt bei Erfolg «Datenbank erreichbar»', () => {
    render(<DatabaseStatus result={{ status: 'ok' }} />)

    expect(screen.getByRole('status')).toHaveTextContent('Datenbank erreichbar')
  })

  it('zeigt die vereinbarte Meldung, wenn die Datenbank nicht erreichbar ist', () => {
    render(
      <DatabaseStatus
        result={{ status: 'unreachable', message: UNREACHABLE_MESSAGE }}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(UNREACHABLE_MESSAGE)
  })

  it('nennt bei fehlender Konfiguration die Namen der Variablen', () => {
    render(
      <DatabaseStatus
        result={{
          status: 'config-error',
          variables: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
          message: 'Ungültige Konfiguration.',
        }}
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('NEXT_PUBLIC_SUPABASE_URL')
    expect(alert).toHaveTextContent('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })
})
