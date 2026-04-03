// In-memory sliding-window rate limiter. Keyed by IP + route.
const store = new Map<string, number[]>()

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now  = Date.now()
  const hits = (store.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= limit) {
    const oldest = hits[0] ?? now
    const retryMs = Math.max(1, windowMs - (now - oldest))
    return { ok: false, retryAfter: Math.ceil(retryMs / 1000) }
  }
  store.set(key, [...hits, now])
  return { ok: true, retryAfter: 0 }
}

export function getIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

export function tooManyRequests(retryAfter: number) {
  return new Response(
    JSON.stringify({ error: `Rate limit exceeded. Retry in ${retryAfter}s.` }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
  )
}

