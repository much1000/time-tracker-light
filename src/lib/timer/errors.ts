// Fehler der Datenschicht für den Timer. Die Oberfläche übersetzt sie in Meldungen.

export type TimerErrorKind =
  | 'target-archived'
  | 'target-not-found'
  | 'no-timer'
  | 'description-too-long'
  | 'session'
  | 'unreachable'
  | 'unknown'

export class TimerError extends Error {
  readonly kind: TimerErrorKind

  constructor(kind: TimerErrorKind) {
    super(kind)
    this.name = 'TimerError'
    this.kind = kind
  }
}

export function describeTimerError(error: unknown): string {
  if (error instanceof TimerError) {
    switch (error.kind) {
      case 'target-archived':
        return 'Dieses Projekt ist archiviert. Reaktiviere es unter «Kunden», um einen Timer zu starten.'
      case 'target-not-found':
        return 'Dieses Projekt gibt es nicht mehr. Bitte lade die Seite neu.'
      case 'no-timer':
        return 'Der Timer wurde schon beendet.'
      case 'description-too-long':
        return 'Die Beschreibung darf höchstens 1000 Zeichen haben.'
      case 'session':
        return 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an. Der Timer läuft weiter.'
      case 'unreachable':
        return 'Keine Verbindung. Der Timer läuft weiter, bitte versuche es gleich erneut.'
    }
  }
  return 'Das hat nicht geklappt. Bitte versuche es erneut.'
}
