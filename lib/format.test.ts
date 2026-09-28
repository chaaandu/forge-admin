import { describe, expect, it } from 'vitest'
import { day, dayRange, inr, inrShort, weekday } from './format.ts'

describe('format', () => {
  it('groups rupees the Indian way', () => {
    expect(inr(2334933)).toBe('₹23,34,933')
    expect(inrShort(14_800_000)).toBe('₹1.48 Cr')
    expect(inrShort(213_000)).toBe('₹2.1L')
  })

  it('writes a week as a short date range', () => {
    expect(dayRange('2026-09-22', '2026-09-28')).toBe('22–28 Sep')
    expect(dayRange('2026-09-28', '2026-10-04')).toBe('28 Sep – 4 Oct')
  })

  it('writes September as Sep everywhere', () => {
    expect(day('2026-09-14')).toBe('14 Sep')
    expect(weekday('2026-09-15')).toBe('Tue, 15 Sep')
  })
})
