// Fehler der Datenschicht. Die Oberfläche übersetzt sie in Hinweise am Feld oder eine Meldung.

export type RepositoryErrorKind =
  | 'duplicate-code'
  | 'duplicate-name'
  | 'duplicate-project'
  | 'not-found'
  | 'customer-archived'
  | 'session'
  | 'unreachable'
  | 'unknown'

export class RepositoryError extends Error {
  readonly kind: RepositoryErrorKind
  // Der Treffer liegt im Archiv («Diesen Kunden gibt es schon (im Archiv)»)
  readonly inArchive: boolean

  constructor(kind: RepositoryErrorKind, options: { inArchive?: boolean } = {}) {
    super(kind)
    this.name = 'RepositoryError'
    this.kind = kind
    this.inArchive = options.inArchive ?? false
  }
}

export interface DescribedError {
  message: string
  // Feld im Formular, an dem der Hinweis erscheint (sonst allgemeine Meldung)
  field?: 'code' | 'name'
}

const ARCHIVE_SUFFIX = ' (im Archiv)'

export function describeRepositoryError(error: unknown): DescribedError {
  if (error instanceof RepositoryError) {
    const suffix = error.inArchive ? ARCHIVE_SUFFIX : ''
    switch (error.kind) {
      case 'duplicate-code':
        return { field: 'code', message: `Dieses Kürzel gibt es schon${suffix}.` }
      case 'duplicate-name':
        return { field: 'name', message: `Diesen Kunden gibt es schon${suffix}.` }
      case 'duplicate-project':
        return {
          field: 'name',
          message: `Dieses Projekt gibt es bei diesem Kunden schon${suffix}.`,
        }
      case 'not-found':
        return { message: 'Dieser Eintrag existiert nicht mehr. Bitte lade die Seite neu.' }
      case 'customer-archived':
        return { message: 'Der Kunde ist archiviert. Reaktiviere ihn zuerst.' }
      case 'session':
        return {
          message: 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an. Deine Eingabe bleibt erhalten.',
        }
      case 'unreachable':
        return {
          message: 'Die Daten sind gerade nicht erreichbar. Bitte versuche es später erneut.',
        }
    }
  }
  return { message: 'Das hat nicht geklappt. Bitte versuche es erneut.' }
}
