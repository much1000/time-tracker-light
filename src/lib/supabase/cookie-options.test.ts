import { describe, expect, it } from 'vitest'
import { isHttpsProtocol, sessionCookieOptions } from './cookie-options'

describe('isHttpsProtocol', () => {
  it.each([
    ['https', true],
    ['https:', true],
    ['HTTPS', true],
    [' https ', true],
    ['https,http', true],
    ['http', false],
    ['http:', false],
    ['http,https', false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('«%s» → %s', (value, expected) => {
    expect(isHttpsProtocol(value)).toBe(expected)
  })
})

describe('sessionCookieOptions', () => {
  it('setzt Secure nur unter HTTPS', () => {
    expect(sessionCookieOptions(true)).toEqual({ secure: true })
    expect(sessionCookieOptions(false)).toEqual({})
  })
})
