import { NextResponse } from 'next/server'
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  const currentItem = body.currentItem as Record<string, unknown> | undefined
  const messages    = body.messages    as unknown[] | undefined

  if (!currentItem) {
    return NextResponse.json({ error: 'currentItem is required' }, { status: 400 })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 })
  }

  const sessionContext = (body.sessionContext as Record<string, unknown>) ?? {}
  const constraints    = (body.constraints   as Record<string, unknown>) ?? {}

  // Map camelCase (frontend) → snake_case (Python agent)
  const payload = {
    model: body.model ?? 'openai/gpt-4o-mini',
    session_context: {
      language:    sessionContext.language    ?? 'Spanish',
      drill_type:  sessionContext.drillType   ?? 'translation',
      item_index:  sessionContext.itemIndex   ?? 0,
      items_total: sessionContext.itemsTotal  ?? 1,
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
    messages: (messages as { role: string; content: string }[]).map(m => ({
      role:    m.role,
      content: m.content,
    })),
    constraints: {
      max_coach_turns:    constraints.maxCoachTurns    ?? 10,
      max_hint_level:     constraints.maxHintLevel     ?? 3,
      current_hint_level: constraints.currentHintLevel ?? 0,
    },
  }

  try {
    const agentRes = await fetch(`${AGENT_URL}/tutor`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      // Ollama inference can be slow — 60s is enough for a short chat reply
      signal:  AbortSignal.timeout(60_000),
    })

    const data = await agentRes.json()

    if (!agentRes.ok) {
      return NextResponse.json(
        { error: data.detail ?? 'Agent error' },
        { status: agentRes.status },
      )
    }

    // Map snake_case (Python) → camelCase (frontend)
    const structured = data.structured
      ? {
          hintLevel:       data.structured.hint_level       ?? null,
          suggestedPhrase: data.structured.suggested_phrase ?? null,
          learnerReady:    data.structured.learner_ready    ?? null,
        }
      : null

    const res = NextResponse.json({
      assistantMessage: data.assistant_message,
      structured,
      model:     data.model,
      elapsedMs: data.elapsed_ms,
    })
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  } catch (err) {
    const msg      = err instanceof Error ? err.message : String(err)
    const isDown   = msg.includes('ECONNREFUSED') || msg.includes('fetch failed')
                  || msg.includes('timeout')       || msg.includes('TimeoutError')
    const res = NextResponse.json(
      {
        error: isDown
          ? 'Python agent is not running or timed out — start it with: cd agent && uvicorn main:app --port 8000 --reload'
          : `Tutor error: ${msg}`,
      },
      { status: 502 },
    )
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
}
