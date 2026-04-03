import { NextResponse } from 'next/server'

// Demo mode — language preference is stored in localStorage on the client
export async function GET() {
  return NextResponse.json({ language: 'es' })
}

export async function PUT() {
  return NextResponse.json({ ok: true })
}
