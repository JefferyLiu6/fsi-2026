import { NextResponse } from 'next/server'

// Demo mode — registration is disabled
export async function POST() {
  return NextResponse.json({ ok: true })
}
