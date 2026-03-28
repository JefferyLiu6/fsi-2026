import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'

const COOKIE = 'fsi_auth'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not set')
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: { userId: string; email: string; name?: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; name?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as { userId: string; email: string; name?: string }
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ userId: string; email: string; name?: string } | null> {
  // Accept Bearer token from mobile clients
  const headerStore = await headers()
  const auth = headerStore.get('authorization')
  if (auth?.startsWith('Bearer ')) return verifyToken(auth.slice(7))
  // Fall back to cookie for web clients
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setSessionCookie(userId: string, email: string, name?: string): Promise<void> {
  const token = await signToken({ userId, email, name })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE)
}
