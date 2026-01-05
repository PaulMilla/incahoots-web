import { describe, it, expect } from 'vitest'
import { convertDateToLocalString } from '../timestamps'

describe('convertDateToLocalString', () => {
  it('formats date to YYYY-MM-DDTHH:mm format', () => {
    // Create a date with known values
    const date = new Date(2024, 0, 15, 14, 30) // Jan 15, 2024 at 2:30 PM
    expect(convertDateToLocalString(date)).toBe('2024-01-15T14:30')
  })

  it('pads single digit months and days', () => {
    const date = new Date(2024, 2, 5, 9, 5) // March 5, 2024 at 9:05 AM
    expect(convertDateToLocalString(date)).toBe('2024-03-05T09:05')
  })

  it('handles midnight correctly', () => {
    const date = new Date(2024, 11, 31, 0, 0) // Dec 31, 2024 at midnight
    expect(convertDateToLocalString(date)).toBe('2024-12-31T00:00')
  })
})
