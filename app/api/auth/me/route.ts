import { NextResponse } from 'next/server'

// Demo mode — no auth; always returns null so the Nav shows no user
export async function GET() {
  return NextResponse.json(null)
}
