import { NextResponse } from 'next/server'

// Demo mode — sessions are stored in localStorage on the client; these stubs exist only so the build compiles.
export async function GET() {
  return NextResponse.json([])
}

export async function POST() {
  return NextResponse.json({ ok: true })
}
