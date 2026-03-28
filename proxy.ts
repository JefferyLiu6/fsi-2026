import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/drill', '/dashboard', '/library', '/study']
const COOKIE = 'fsi_auth'

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtected = PROTECTED.some(p => path === p || path.startsWith(p + '/'))

  if (isProtected && !req.cookies.get(COOKIE)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/drill', '/drill/:path*',
    '/dashboard', '/dashboard/:path*',
    '/library', '/library/:path*',
    '/study', '/study/:path*',
  ],
}
