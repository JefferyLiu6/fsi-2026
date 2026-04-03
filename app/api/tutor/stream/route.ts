import { checkRateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getOrCreateDemoSession } from '@/lib/demoSession'
import { RATE_LIMIT } from '@/lib/rateLimitConfig'
import { checkGlobalDailyAiLimit } from '@/lib/globalRateLimit'

const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:8000'

export async function POST(req: Request) {
  const { sessionId, setCookieHeader } = getOrCreateDemoSession(req)
  const ip = getIp(req)
  const rlSessionMinute = checkRateLimit(
    `tutor:s:m:${sessionId}`,
    RATE_LIMIT.ai.tutor.sessionMinute,
    RATE_LIMIT.windows.minuteMs,
  )
  if (!rlSessionMinute.ok) {
    const res = tooManyRequests(rlSessionMinute.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const rlSessionDaily = checkRateLimit(
    `ai:s:d:${sessionId}`,
    RATE_LIMIT.ai.tutor.sessionDaily,
    RATE_LIMIT.windows.dayMs,
  )
  if (!rlSessionDaily.ok) {
    const res = tooManyRequests(rlSessionDaily.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const rlIpMinute = checkRateLimit(
    `tutor:ip:m:${ip}`,
    RATE_LIMIT.ai.tutor.ipMinute,
    RATE_LIMIT.windows.minuteMs,
  )
  if (!rlIpMinute.ok) {
    const res = tooManyRequests(rlIpMinute.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const rlIpDaily = checkRateLimit(
    `ai:ip:d:${ip}`,
    RATE_LIMIT.ai.tutor.ipDaily,
    RATE_LIMIT.windows.dayMs,
  )
  if (!rlIpDaily.ok) {
    const res = tooManyRequests(rlIpDaily.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  // Global daily cap across all users and regions (single-instance scope).
  const rlGlobalDaily = await checkGlobalDailyAiLimit()
  if (!rlGlobalDaily.ok) {
    const res = tooManyRequests(rlGlobalDaily.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const currentItem    = body.currentItem    as Record<string, unknown> | undefined
  const sessionContext = (body.sessionContext as Record<string, unknown>) ?? {}
  const constraints    = (body.constraints   as Record<string, unknown>) ?? {}
  const messages       = (body.messages      as { role: string; content: string }[]) ?? []

  if (!currentItem) {
    return new Response('currentItem is required', { status: 400 })
  }

  const payload = {
    mode:  body.mode ?? 'tutor',
    model: body.model ?? 'openai/gpt-4o-mini',
    session_context: {
      language:    sessionContext.language   ?? 'Spanish',
      drill_type:  sessionContext.drillType  ?? 'translation',
      item_index:  sessionContext.itemIndex  ?? 0,
      items_total: sessionContext.itemsTotal ?? 1,
    },
    current_item: {
      instruction:     currentItem.instruction     ?? '',
      prompt:          currentItem.prompt          ?? '',
      type:            currentItem.type            ?? 'translation',
      expected_answer: currentItem.expectedAnswer  ?? '',
      user_answer:     currentItem.userAnswer      ?? '',
      feedback:        currentItem.feedback        ?? 'incorrect',
    },
    recent_items: ((body.recentItems as Record<string, unknown>[]) ?? []).map(r => ({
      prompt:      r.prompt      ?? '',
      user_answer: r.userAnswer  ?? '',
      correct:     r.correct     ?? false,
      timed_out:   r.timedOut    ?? false,
    })),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    constraints: {
      max_coach_turns:    constraints.maxCoachTurns    ?? 10,
      max_hint_level:     constraints.maxHintLevel     ?? 3,
      current_hint_level: constraints.currentHintLevel ?? 0,
    },
  }

  try {
    const agentRes = await fetch(`${AGENT_URL}/tutor/stream`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(60_000),
    })

    if (!agentRes.ok || !agentRes.body) {
      return new Response(`Agent error: ${agentRes.status}`, { status: agentRes.status })
    }

    const res = new Response(agentRes.body, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const res = new Response(
      `data: ${JSON.stringify({ error: `Agent unavailable: ${msg}` })}\n\n`,
      { status: 502, headers: { 'Content-Type': 'text/event-stream' } },
    )
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
}
