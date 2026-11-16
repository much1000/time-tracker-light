import { describe, expect, it } from 'vitest'
import { speakDuration } from './duration'

describe('speakDuration', () => {
  it.each([
    [0, '0 Minuten'],
    [1, '1 Minute'],
    [45, '45 Minuten'],
    [60, '1 Stunde'],
    [90, '1 Stunde 30 Minuten'],
    [121, '2 Stunden 1 Minute'],
    [120, '2 Stunden'],
    [1440, '24 Stunden'],
  ])('%i Minuten werden zu «%s»', (minutes, expected) => {
    expect(speakDuration(minutes)).toBe(expected)
  })
})
