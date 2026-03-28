import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ items: [] }, { status: 401 })

  const record = await prisma.customList.findUnique({ where: { userId: session.userId } })
  if (!record) return NextResponse.json({ items: [] })
  return NextResponse.json({ items: JSON.parse(record.items) })
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items } = await req.json()
  await prisma.customList.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, items: JSON.stringify(items) },
    update: { items: JSON.stringify(items) },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.customList.deleteMany({ where: { userId: session.userId } })
  return NextResponse.json({ ok: true })
}
