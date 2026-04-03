import { NextResponse } from 'next/server'

// Demo mode — auth is disabled
export async function POST() {
  return NextResponse.json({ ok: true })
}
