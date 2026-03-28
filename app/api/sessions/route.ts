import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json([], { status: 401 })

  const rows = await prisma.drillSession.findMany({
    where: { userId: session.userId },
    orderBy: { date: 'desc' },
    take: 50,
  })

  return NextResponse.json(
    rows.map(r => ({
      id: r.id,
      date: r.date,
      drillType: r.drillType,
      language: r.language,
      correct: r.correct,
      total: r.total,
      accuracy: r.accuracy,
      avgTime: r.avgTime,
      results: JSON.parse(r.results),
    }))
  )
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    await prisma.drillSession.create({
      data: {
        id: data.id,
        userId: session.userId,
        date: data.date,
        drillType: data.drillType,
        language: data.language ?? null,
        correct: data.correct,
        total: data.total,
        accuracy: data.accuracy,
        avgTime: data.avgTime,
        results: JSON.stringify(data.results),
      },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save session.' }, { status: 500 })
  }
}
