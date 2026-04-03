import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Demo mode — all routes are publicly accessible, no auth required
export function proxy(_req: NextRequest) {
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
