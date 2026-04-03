import { NextResponse } from 'next/server'
import { checkRateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getOrCreateDemoSession } from '@/lib/demoSession'
import { RATE_LIMIT } from '@/lib/rateLimitConfig'

// Demo utility endpoint: resets client UX state only.
// It intentionally does NOT clear server-side quotas.
export async function POST(req: Request) {
  const { sessionId, setCookieHeader } = getOrCreateDemoSession(req)
  const ip = getIp(req)
  const burst = checkRateLimit(
    `reset:s:m:${sessionId}`,
    RATE_LIMIT.reset.sessionBurst,
    RATE_LIMIT.windows.resetBurstMs,
  )
  if (!burst.ok) {
    const res = tooManyRequests(burst.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const dailySession = checkRateLimit(
    `reset:s:d:${sessionId}`,
    RATE_LIMIT.reset.sessionDaily,
    RATE_LIMIT.windows.dayMs,
  )
  if (!dailySession.ok) {
    const res = tooManyRequests(dailySession.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const dailyIp = checkRateLimit(
    `reset:ip:d:${ip}`,
    RATE_LIMIT.reset.ipDaily,
    RATE_LIMIT.windows.dayMs,
  )
  if (!dailyIp.ok) {
    const res = tooManyRequests(dailyIp.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }

  const res = NextResponse.json({ ok: true, clearedBuckets: 0 })
  if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
  return res
}
