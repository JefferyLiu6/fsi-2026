import { NextResponse } from 'next/server'

// Demo mode — custom list is stored in localStorage on the client
export async function GET() {
  return NextResponse.json({ items: [] })
}

export async function PUT() {
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  return NextResponse.json({ ok: true })
}
