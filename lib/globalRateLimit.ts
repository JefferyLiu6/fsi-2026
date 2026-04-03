import { checkRateLimit } from '@/lib/rateLimit'
import { RATE_LIMIT } from '@/lib/rateLimitConfig'

type LimitResult = { ok: boolean; retryAfter: number }

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

function utcDayKeyPrefix(prefix: string): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${prefix}:${y}-${m}-${d}`
}

function secondsUntilNextUtcDay(): number {
  const now = new Date()
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  )
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000))
}

async function upstashNumber(path: string): Promise<number> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) throw new Error('Upstash not configured')
  const res = await fetch(`${UPSTASH_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Upstash command failed (${res.status})`)
  const data = await res.json()
  const value = Number(data?.result)
  if (!Number.isFinite(value)) throw new Error('Invalid Upstash numeric response')
  return value
}

export async function checkGlobalDailyAiLimit(): Promise<LimitResult> {
  const limit = RATE_LIMIT.ai.globalDaily

  // Fallback for local development when Redis is not configured.
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return checkRateLimit('ai:global:d', limit, RATE_LIMIT.windows.dayMs)
  }

  const key = utcDayKeyPrefix('ai:global:d')

  try {
    const count = await upstashNumber(`/incr/${encodeURIComponent(key)}`)
    if (count === 1) {
      const ttl = secondsUntilNextUtcDay()
      await upstashNumber(`/expire/${encodeURIComponent(key)}/${ttl}`)
    }
    if (count <= limit) return { ok: true, retryAfter: 0 }

    const ttl = await upstashNumber(`/ttl/${encodeURIComponent(key)}`)
    return { ok: false, retryAfter: Math.max(1, ttl) }
  } catch {
    // If Redis is temporarily unavailable, fail closed to protect budget.
    return { ok: false, retryAfter: 60 }
  }
}

