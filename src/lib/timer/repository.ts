import type { StartResult, StopResult, TimerSnapshot } from './types'

// Schnittstelle zur Datenhaltung für den laufenden Timer. Dahinter steht Supabase
// (supabase-repository.ts); Start, Stopp, Wechsel und Verwerfen sind je ein unteilbarer Schritt in
// der Datenbank. Alle Methoden werfen bei Fehlern einen TimerError (siehe errors.ts).
export interface TimerRepository {
  // Aktueller Timer (oder null) samt Serverzeit.
  getTimer(): Promise<TimerSnapshot>
  // Startet einen Timer bei einem aktiven Projekt. Ein laufender Timer bei einem anderen Projekt wird
  // dabei gespeichert (oder bei unter einer Minute verworfen).
  startTimer(projectId: string): Promise<StartResult>
  // Stoppt den Timer und speichert die Einträge. «description»: letzter Stand des Textes
  // (undefined = gespeicherten Text behalten, leer = keine Beschreibung).
  stopTimer(description?: string): Promise<StopResult>
  // Verwirft den Timer ohne Eintrag. Gibt zurück, ob einer lief.
  discardTimer(): Promise<boolean>
  // Speichert die Beschreibung des laufenden Timers (leer = keine).
  saveDescription(timerId: string, description: string): Promise<void>
}
