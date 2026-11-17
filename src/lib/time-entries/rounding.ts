// Abrechnung in 15-Minuten-Einheiten (PROJ-8). Einzige Stelle der Rundungsregel: Monatsauswertung
// und später der CSV-Export (PROJ-9) rechnen mit dieser Funktion, damit Bildschirm und Export dieselben
// Zahlen zeigen. Gerundet wird die Summe pro Projekt, nie ein einzelner Eintrag. Alles in ganzen Minuten.

export const BILLING_UNIT_MINUTES = 15

// Nächstes Vielfaches von 15 Minuten nach oben: 0 → 0, 1 → 15, 15 → 15, 16 → 30.
export function roundUpToBillingUnit(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0
  return Math.ceil(minutes / BILLING_UNIT_MINUTES) * BILLING_UNIT_MINUTES
}
