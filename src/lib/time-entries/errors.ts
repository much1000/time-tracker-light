// Fehler der Datenschicht für Zeiteinträge. Die Oberfläche übersetzt sie in Meldungen.

export type TimeEntryErrorKind =
  | 'target-archived'
  | 'target-not-found'
  | 'date-in-future'
  | 'entry-not-found'
  | 'export-changed'
  | 'session'
  | 'unreachable'
  | 'unknown'

export class TimeEntryError extends Error {
  readonly kind: TimeEntryErrorKind

  constructor(kind: TimeEntryErrorKind) {
    super(kind)
    this.name = 'TimeEntryError'
    this.kind = kind
  }
}

export function describeTimeEntryError(error: unknown): string {
  if (error instanceof TimeEntryError) {
    switch (error.kind) {
      case 'target-archived':
        return 'Dieses Projekt ist archiviert. Wähle ein anderes Projekt oder reaktiviere es unter «Kunden».'
      case 'target-not-found':
        return 'Dieses Projekt gibt es nicht mehr. Bitte lade die Seite neu.'
      case 'date-in-future':
        return 'Das Datum darf nicht in der Zukunft liegen.'
      case 'entry-not-found':
        return 'Dieser Eintrag existiert nicht mehr. Die Liste wird neu geladen.'
      case 'export-changed':
        return 'Während des Exports wurden Zeiten geändert. Bitte starte den Export erneut.'
      case 'session':
        return 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an. Deine Eingabe bleibt erhalten.'
      case 'unreachable':
        return 'Die Daten sind gerade nicht erreichbar. Bitte versuche es später erneut.'
    }
  }
  return 'Das hat nicht geklappt. Bitte versuche es erneut.'
}
