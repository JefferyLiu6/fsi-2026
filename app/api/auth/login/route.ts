import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setSessionCookie, signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    await setSessionCookie(user.id, user.email, user.name ?? undefined)
    // Also return the raw token so native mobile clients can store it
    // (React Native fetch does not expose Set-Cookie headers)
    const token = await signToken({ userId: user.id, email: user.email, name: user.name ?? undefined })
    return NextResponse.json({ ok: true, user: { email: user.email, name: user.name }, token })
  } catch {
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 })
  }
}
