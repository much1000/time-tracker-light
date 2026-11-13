// Laufender Timer (PROJ-6). Felder und Regeln stehen im Spec «Datenmodell».

export interface RunningTimer {
  id: string
  projectId: string
  projectName: string
  customerId: string
  customerCode: string
  customerName: string
  // Startzeit von der Serveruhr (ISO 8601 mit Sekunden)
  startedAt: string
  description: string | null
}

// Aktueller Stand mit Serverzeit: Die Anzeige rechnet damit, nicht mit der Geräteuhr.
export interface TimerSnapshot {
  timer: RunningTimer | null
  serverNow: string
}

export interface SavedEntry {
  id: string
  // «2026-11-13»
  date: string
  durationMinutes: number
  // «23:30» bzw. «24:00»
  startTime: string
  endTime: string
}

// Ergebnis eines beendeten Timers (Stopp oder Wechsel)
export interface FinishedTimer {
  projectId: string
  projectName: string
  customerCode: string
  customerName: string
  // Unter einer Minute: kein Eintrag
  tooShort: boolean
  totalMinutes: number
  entries: SavedEntry[]
}

export interface StartResult {
  timer: RunningTimer
  // Der vorher laufende Timer (bei einem Wechsel), sonst null
  finished: FinishedTimer | null
  // Beim selben Projekt lief schon ein Timer: nichts geändert
  alreadyRunning: boolean
  serverNow: string
}

export interface StopResult {
  finished: FinishedTimer
  serverNow: string
}
