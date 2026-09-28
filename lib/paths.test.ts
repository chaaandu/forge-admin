import { describe, expect, it } from 'vitest'
import { appPath, isPublicPath } from './paths.ts'

describe('paths', () => {
  it('reads a path the same with or without the /admin prefix', () => {
    expect(appPath('/admin/teams/VBC101')).toBe('/teams/VBC101')
    expect(appPath('/teams/VBC101')).toBe('/teams/VBC101')
    expect(appPath('/admin')).toBe('/')
    expect(appPath('/')).toBe('/')
    expect(appPath('/administrator')).toBe('/administrator')
  })

  it('lets signed-out visitors reach only the login page and the sign-in routes', () => {
    for (const p of ['/login', '/admin/login', '/api/auth/providers', '/admin/api/auth/callback/google', '/admin/api/auth']) {
      expect(isPublicPath(p), p).toBe(true)
    }
    for (const p of ['/', '/admin', '/admin/teams', '/teams', '/admin/api/authx', '/admin/login/extra', '/admin/mentors']) {
      expect(isPublicPath(p), p).toBe(false)
    }
  })
})
