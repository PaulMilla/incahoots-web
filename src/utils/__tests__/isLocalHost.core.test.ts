import { describe, it, expect } from 'vitest'
import { isLocalhost } from '../isLocalHost'

describe('isLocalhost', () => {
  it('returns true for localhost URLs', () => {
    expect(isLocalhost('http://localhost:3000')).toBe(true)
    expect(isLocalhost('https://localhost/path')).toBe(true)
  })

  it('returns true for 127.0.0.1 URLs', () => {
    expect(isLocalhost('http://127.0.0.1:5000')).toBe(true)
    expect(isLocalhost('https://127.0.0.1')).toBe(true)
  })

  it('returns true for IPv6 localhost', () => {
    expect(isLocalhost('http://[::1]:8080')).toBe(true)
  })

  it('returns false for production URLs', () => {
    expect(isLocalhost('https://example.com')).toBe(false)
    expect(isLocalhost('https://api.incahoots.com')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isLocalhost('not-a-url')).toBe(false)
    expect(isLocalhost('')).toBe(false)
  })
})
