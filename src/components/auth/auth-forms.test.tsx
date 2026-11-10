import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordForm, SENT_MESSAGE } from './forgot-password-form'
import { LoginForm } from './login-form'
import { NewPasswordForm } from './new-password-form'
import { PasswordInput } from './password-input'

const signInWithPassword = vi.fn()
const resetPasswordForEmail = vi.fn()
const updateUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword, resetPasswordForEmail, updateUser },
  }),
}))

function fill(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost/login', origin: 'http://localhost' },
    writable: true,
  })
})

describe('PasswordInput', () => {
  it('ist beim Laden verdeckt und lässt sich anzeigen und wieder verbergen', () => {
    render(<PasswordInput aria-label="Passwort" defaultValue="geheim" />)
    const input = screen.getByLabelText('Passwort')

    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort anzeigen' }))
    expect(input).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort verbergen' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('verdeckt das Passwort beim Absenden des Formulars wieder', () => {
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <PasswordInput aria-label="Passwort" />
        <button type="submit">Senden</button>
      </form>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Passwort anzeigen' }))
    expect(screen.getByLabelText('Passwort')).toHaveAttribute('type', 'text')

    fireEvent.submit(screen.getByRole('button', { name: 'Senden' }).closest('form')!)

    expect(screen.getByLabelText('Passwort')).toHaveAttribute('type', 'password')
  })

  it('der Schalter ist ein Knopf, der das Formular nicht absendet', () => {
    render(<PasswordInput aria-label="Passwort" />)
    expect(screen.getByRole('button', { name: 'Passwort anzeigen' })).toHaveAttribute('type', 'button')
  })
})

describe('LoginForm', () => {
  it('zeigt Felder mit sichtbaren Beschriftungen und Autofill-Hinweisen', () => {
    render(<LoginForm />)

    const email = screen.getByLabelText('E-Mail')
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'username')
    expect(email).toHaveAttribute('inputmode', 'email')
    expect(email).toHaveAttribute('autocapitalize', 'none')
    expect(screen.getByLabelText('Passwort')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'Passwort vergessen?' })).toHaveAttribute('href', '/passwort-vergessen')
  })

  it('meldet leere Pflichtfelder am Feld und sendet nichts', async () => {
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(await screen.findByText('Bitte gib deine E-Mail-Adresse ein.')).toBeInTheDocument()
    expect(screen.getByText('Bitte gib dein Passwort ein.')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('meldet eine ungültige E-Mail-Adresse und sendet nichts', async () => {
    render(<LoginForm />)
    fill('E-Mail', 'keine-adresse')
    fill('Passwort', 'x')
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(await screen.findByText('Bitte gib eine gültige E-Mail-Adresse ein.')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('meldet bei richtigen Daten an und leitet auf die Startseite', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null })
    render(<LoginForm />)
    fill('E-Mail', '  Michael@Example.ch ')
    fill('Passwort', 'geheim')
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    await waitFor(() => expect(window.location.href).toBe('/'))
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'michael@example.ch', password: 'geheim' })
  })

  it('leitet auf die gemerkte Zielseite, nicht aber auf fremde Adressen', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
    const { unmount } = render(<LoginForm next="/status" />)
    fill('E-Mail', 'a@b.ch')
    fill('Passwort', 'x')
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
    await waitFor(() => expect(window.location.href).toBe('/status'))
    unmount()

    render(<LoginForm next="https://evil.example" />)
    fill('E-Mail', 'a@b.ch')
    fill('Passwort', 'x')
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
    await waitFor(() => expect(window.location.href).toBe('/'))
  })

  it('sperrt den Knopf während der Anmeldung und sendet nur einmal', async () => {
    let resolve!: (value: unknown) => void
    signInWithPassword.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<LoginForm />)
    fill('E-Mail', 'a@b.ch')
    fill('Passwort', 'x')
    const form = screen.getByRole('button', { name: 'Anmelden' }).closest('form')!
    fireEvent.submit(form)

    const busy = await screen.findByRole('button', { name: /Anmelden …/ })
    expect(busy).toBeDisabled()
    fireEvent.submit(form)
    expect(signInWithPassword).toHaveBeenCalledTimes(1)
    resolve({ data: { session: {} }, error: null })
  })

  it('zeigt bei falschen Daten die allgemeine Meldung, behält die E-Mail und leert das Passwort', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', code: 'invalid_credentials', status: 400 },
    })
    render(<LoginForm />)
    fill('E-Mail', 'a@b.ch')
    fill('Passwort', 'falsch')
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-Mail oder Passwort stimmt nicht.')
    expect(screen.getByLabelText('E-Mail')).toHaveValue('a@b.ch')
    expect(screen.getByLabelText('Passwort')).toHaveValue('')
    expect(screen.getByLabelText('Passwort')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Anmelden' })).toBeEnabled()
  })

  it('zeigt bei zu vielen Versuchen den Hinweis zum Warten', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', code: 'over_request_rate_limit', status: 429 },
    })
    render(<LoginForm />)
    fill('E-Mail', 'a@b.ch')
    fill('Passwort', 'x')
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Versuche. Bitte warte ein paar Minuten.')
  })

  it('zeigt bei Netzwerkfehler die Meldung «nicht erreichbar» und behält die Eingabe', async () => {
    signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<LoginForm />)
    fill('E-Mail', 'a@b.ch')
    fill('Passwort', 'x')
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es später erneut.'
    )
    expect(screen.getByLabelText('E-Mail')).toHaveValue('a@b.ch')
  })
})

describe('ForgotPasswordForm', () => {
  it('verlangt eine gültige E-Mail und sendet sonst nichts', async () => {
    render(<ForgotPasswordForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Link senden' }))

    expect(await screen.findByText('Bitte gib deine E-Mail-Adresse ein.')).toBeInTheDocument()
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('zeigt nach dem Senden die neutrale Bestätigung und fordert den Link zur eigenen Adresse an', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    render(<ForgotPasswordForm />)
    fill('E-Mail', 'a@b.ch')
    fireEvent.click(screen.getByRole('button', { name: 'Link senden' }))

    expect(await screen.findByRole('status')).toHaveTextContent(SENT_MESSAGE)
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.ch', {
      redirectTo: 'http://localhost/auth/bestaetigen?next=/passwort-neu',
    })
    expect(screen.getByRole('link', { name: 'Zurück zur Anmeldung' })).toHaveAttribute('href', '/login')
  })

  it('verrät nicht, ob eine Adresse existiert: gleiche Antwort auch bei «Nutzer unbekannt»', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error: { code: 'user_not_found', status: 400 } })
    render(<ForgotPasswordForm />)
    fill('E-Mail', 'unbekannt@b.ch')
    fireEvent.click(screen.getByRole('button', { name: 'Link senden' }))

    expect(await screen.findByRole('status')).toHaveTextContent(SENT_MESSAGE)
  })

  it('zeigt bei zu vielen Anfragen den Hinweis und bleibt im Formular', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error: { code: 'over_email_send_rate_limit', status: 429 } })
    render(<ForgotPasswordForm />)
    fill('E-Mail', 'a@b.ch')
    fireEvent.click(screen.getByRole('button', { name: 'Link senden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Versuche. Bitte warte ein paar Minuten.')
    expect(screen.getByLabelText('E-Mail')).toHaveValue('a@b.ch')
  })

  it('zeigt bei ungültigem Link den Hinweis und das Formular für einen neuen Link', () => {
    render(<ForgotPasswordForm linkInvalid />)

    expect(screen.getByRole('alert')).toHaveTextContent('Dieser Link ist nicht mehr gültig.')
    expect(screen.getByRole('button', { name: 'Link senden' })).toBeInTheDocument()
  })
})

describe('NewPasswordForm', () => {
  it('hat ein Passwortfeld mit Anzeigen-Schalter und nennt die Mindestlänge', () => {
    render(<NewPasswordForm />)

    expect(screen.getByLabelText('Neues Passwort')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByText('Mindestens 10 Zeichen.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Passwort anzeigen' })).toBeInTheDocument()
  })

  it('lehnt ein zu kurzes Passwort am Feld ab und speichert nichts', async () => {
    render(<NewPasswordForm />)
    fill('Neues Passwort', 'kurz')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    expect(await screen.findByText('Das Passwort braucht mindestens 10 Zeichen.')).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('speichert ein gültiges Passwort und leitet auf die Startseite', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null })
    render(<NewPasswordForm />)
    fill('Neues Passwort', 'ein-langes-passwort')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    await waitFor(() => expect(window.location.href).toBe('/'))
    expect(updateUser).toHaveBeenCalledWith({ password: 'ein-langes-passwort' })
  })

  it('zeigt bei abgelaufener Sitzung «Link nicht mehr gültig» mit Weg zum neuen Link', async () => {
    updateUser.mockResolvedValue({ data: null, error: { name: 'AuthSessionMissingError' } })
    render(<NewPasswordForm />)
    fill('Neues Passwort', 'ein-langes-passwort')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Dieser Link ist nicht mehr gültig.')
    expect(screen.getByRole('link', { name: 'Neuen Link anfordern' })).toHaveAttribute('href', '/passwort-vergessen')
  })

  it('zeigt Hinweis, wenn das neue Passwort dem alten entspricht', async () => {
    updateUser.mockResolvedValue({ data: null, error: { code: 'same_password', status: 422 } })
    render(<NewPasswordForm />)
    fill('Neues Passwort', 'ein-langes-passwort')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Das neue Passwort muss sich vom bisherigen unterscheiden.')
  })
})
