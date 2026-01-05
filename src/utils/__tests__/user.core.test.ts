import { describe, it, expect } from 'vitest'
import { getInitials } from '../user'

describe('getInitials', () => {
  it('extracts initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('Alice Bob Charlie')).toBe('ABC')
  })

  it('handles single name', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('uppercases lowercase names', () => {
    expect(getInitials('john doe')).toBe('JD')
  })
})
