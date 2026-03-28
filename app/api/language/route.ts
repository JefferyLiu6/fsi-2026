import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ language: 'es' }, { status: 401 })

  const settings = await prisma.userSettings.findUnique({ where: { userId: session.userId } })
  return NextResponse.json({ language: settings?.language ?? 'es' })
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { language } = await req.json()
  await prisma.userSettings.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, language },
    update: { language },
  })
  return NextResponse.json({ ok: true })
}
