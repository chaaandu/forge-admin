import { NextRequest } from 'next/server'
import { handlers } from '@/auth'

/**
 * Next hands a route handler its URL with the `/admin` basePath already
 * stripped, while Auth.js is configured with `/admin/api/auth` so that every
 * URL it builds — above all the redirect_uri it sends Google — carries the
 * prefix. Put the prefix back before Auth.js reads the request, or it cannot
 * recognise its own routes ("UnknownAction").
 */
const BASE = '/admin'

function withBase(handler: (req: NextRequest) => Promise<Response>) {
  return (req: NextRequest) => {
    const url = new URL(req.url)
    if (!url.pathname.startsWith(BASE + '/')) url.pathname = BASE + url.pathname
    return handler(new NextRequest(url, req))
  }
}

export const GET = withBase(handlers.GET)
export const POST = withBase(handlers.POST)
