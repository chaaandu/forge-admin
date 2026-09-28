import { describe, expect, it } from 'vitest'
import { isStaffEmail } from './staff.ts'

describe('isStaffEmail', () => {
  it('lets staff in', () => {
    expect(isStaffEmail('chandu@mesaschool.co')).toBe(true)
    expect(isStaffEmail('Chandu@MesaSchool.CO')).toBe(true)
  })

  it('refuses students, whose domain is a subdomain of ours', () => {
    expect(isStaffEmail('tanishque_jain@forge27.mesaschool.co')).toBe(false)
  })

  it('refuses look-alikes', () => {
    for (const e of [
      'a@mesaschool.co.in',
      'a@mesaschool.co.evil.com',
      'a@evilmesaschool.co',
      'a@gmail.com',
      'mesaschool.co@gmail.com',
      'a@mesaschool.co@gmail.com',
      '@mesaschool.co',
      'mesaschool.co',
      '',
      null,
      undefined,
    ]) {
      expect(isStaffEmail(e), String(e)).toBe(false)
    }
  })
})
