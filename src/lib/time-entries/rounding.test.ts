import { describe, expect, it } from 'vitest'
import { BILLING_UNIT_MINUTES, roundUpToBillingUnit } from './rounding'

describe('roundUpToBillingUnit', () => {
  it('rechnet in 15-Minuten-Einheiten', () => {
    expect(BILLING_UNIT_MINUTES).toBe(15)
  })

  it.each([
    [0, 0],
    [1, 15],
    [14, 15],
    [15, 15],
    [16, 30],
    [29, 30],
    [30, 30],
    [105, 105],
    [106, 120],
    [470, 480],
    [480, 480],
    [1440, 1440],
    [1441, 1455],
  ])('%i Minuten werden zu %i', (minutes, expected) => {
    expect(roundUpToBillingUnit(minutes)).toBe(expected)
  })

  it('ist nie kleiner als die Eingabe und höchstens 14 Minuten grösser', () => {
    for (let minutes = 0; minutes <= 3000; minutes += 1) {
      const rounded = roundUpToBillingUnit(minutes)
      expect(rounded).toBeGreaterThanOrEqual(minutes)
      expect(rounded - minutes).toBeLessThan(15)
      expect(rounded % 15).toBe(0)
    }
  })

  it('behandelt ungültige Werte als 0', () => {
    expect(roundUpToBillingUnit(-5)).toBe(0)
    expect(roundUpToBillingUnit(Number.NaN)).toBe(0)
    expect(roundUpToBillingUnit(Number.POSITIVE_INFINITY)).toBe(0)
  })
})
