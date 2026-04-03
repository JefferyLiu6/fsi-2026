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
    `gen:s:m:${sessionId}`,
    RATE_LIMIT.ai.generate.sessionMinute,
    RATE_LIMIT.windows.minuteMs,
  )
  if (!rlSessionMinute.ok) {
    const res = tooManyRequests(rlSessionMinute.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const rlSessionDaily = checkRateLimit(
    `ai:s:d:${sessionId}`,
    RATE_LIMIT.ai.generate.sessionDaily,
    RATE_LIMIT.windows.dayMs,
  )
  if (!rlSessionDaily.ok) {
    const res = tooManyRequests(rlSessionDaily.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const rlIpMinute = checkRateLimit(
    `gen:ip:m:${ip}`,
    RATE_LIMIT.ai.generate.ipMinute,
    RATE_LIMIT.windows.minuteMs,
  )
  if (!rlIpMinute.ok) {
    const res = tooManyRequests(rlIpMinute.retryAfter)
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
  const rlIpDaily = checkRateLimit(
    `ai:ip:d:${ip}`,
    RATE_LIMIT.ai.generate.ipDaily,
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

  // Remap camelCase from the frontend to the snake_case the Python agent expects
  const payload = {
    mode:       body.mode,
    language:   body.language   ?? 'Spanish',
    count:      body.count      ?? 10,
    model:      body.model      ?? 'openai/gpt-4o-mini',
    raw_prompt: body.rawPrompt  ?? '',
    guided: {
      topic:      body.topic      ?? 'daily',
      difficulty: body.difficulty ?? 'b1',
      grammar:    body.grammar    ?? 'mixed',
      drill_type: body.drillType  ?? 'translation',
    },
  }

  try {
    const agentRes = await fetch(`${AGENT_URL}/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      // Ollama can be slow — give the agent up to 120s
      signal:  AbortSignal.timeout(120_000),
    })

    const data = await agentRes.json()

    if (!agentRes.ok) {
      return NextResponse.json(
        { error: data.detail ?? 'Agent error' },
        { status: agentRes.status }
      )
    }

    // Remap snake_case back to camelCase for the frontend
    const drills = (data.drills as {
      id: string; type: string; instruction: string;
      prompt: string; answer: string; prompt_lang: string
    }[]).map(d => ({
      id:          d.id,
      type:        d.type,
      instruction: d.instruction,
      prompt:      d.prompt,
      answer:      d.answer,
      promptLang:  d.prompt_lang,
    }))

    const res = NextResponse.json({ drills, model: data.model, elapsedMs: data.elapsed_ms })
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isDown = msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')
    const res = NextResponse.json(
      { error: isDown ? 'Python agent is not running — start it with: cd agent && uvicorn main:app --port 8000 --reload' : msg },
      { status: 502 }
    )
    if (setCookieHeader) res.headers.append('Set-Cookie', setCookieHeader)
    return res
  }
}
