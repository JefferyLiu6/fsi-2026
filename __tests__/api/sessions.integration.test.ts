/**
 * Integration tests for the sessions API.
 *
 * Covers: unauthenticated rejection, round-trip save + retrieve,
 * and per-user isolation (one user cannot see another's sessions).
 */
import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest'

// ── In-memory fakes ───────────────────────────────────────────────────────────

type SessionRow = {
  id: string; userId: string; date: number; drillType: string; language: string | null
  correct: number; total: number; accuracy: number; avgTime: number; results: string
}

const _sessions: SessionRow[] = []

vi.mock('@/lib/prisma', () => ({
  prisma: {
    drillSession: {
      findMany: vi.fn(({ where }: { where: { userId: string } }) =>
        Promise.resolve(_sessions.filter(s => s.userId === where.userId))
      ),
      create: vi.fn(({ data }: { data: SessionRow }) => {
        _sessions.push(data)
        return Promise.resolve(data)
      }),
    },
  },
}))

// ── Cookie jar (controls which user is "logged in") ───────────────────────────

let _activeCookie: string | null = null

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: () => undefined,
  })),
  cookies: vi.fn(() => ({
    get: (n: string) => n === 'fsi_auth' && _activeCookie ? { name: n, value: _activeCookie } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

import { signToken }                  from '@/lib/auth'
import { GET as getSessions, POST as postSession } from '@/app/api/sessions/route'

// ─────────────────────────────────────────────────────────────────────────────

const sessionPayload = (id = 'sess-1', userId = 'u1') => ({
  id,
  userId,
  date: Date.now(),
  drillType: 'translation',
  language: 'es',
  correct: 8,
  total: 10,
  accuracy: 80,
  avgTime: 4.2,
  results: [],
})

const jsonReq = (body: unknown) =>
  new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeAll(() => {
  process.env.JWT_SECRET = 'integration-test-secret-at-least-32-chars!'
})

beforeEach(() => {
  _sessions.length = 0
  _activeCookie = null
})

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('Sessions API — auth guard', () => {
  it('GET returns 401 when not logged in', async () => {
    const res = await getSessions()
    expect(res.status).toBe(401)
  })

  it('POST returns 401 when not logged in', async () => {
    const res = await postSession(jsonReq(sessionPayload()))
    expect(res.status).toBe(401)
  })
})

// ── Save + retrieve ───────────────────────────────────────────────────────────

describe('Sessions API — save and retrieve', () => {
  it('saves a session and retrieves it', async () => {
    _activeCookie = await signToken({ userId: 'u1', email: 'a@test.com' })

    await postSession(jsonReq(sessionPayload('s1', 'u1')))

    const res = await getSessions()
    expect(res.status).toBe(200)
    const list = await res.json()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 's1', drillType: 'translation', language: 'es', correct: 8, total: 10 })
  })

  it('multiple sessions come back for the same user', async () => {
    _activeCookie = await signToken({ userId: 'u1', email: 'a@test.com' })
    await postSession(jsonReq(sessionPayload('s1', 'u1')))
    await postSession(jsonReq(sessionPayload('s2', 'u1')))

    const list = await (await getSessions()).json()
    expect(list).toHaveLength(2)
  })
})

// ── Per-user isolation ────────────────────────────────────────────────────────

describe('Sessions API — per-user isolation', () => {
  it('user B cannot see user A sessions', async () => {
    // User A saves a session
    _activeCookie = await signToken({ userId: 'u1', email: 'a@test.com' })
    await postSession(jsonReq(sessionPayload('s1', 'u1')))

    // User B retrieves sessions — should be empty
    _activeCookie = await signToken({ userId: 'u2', email: 'b@test.com' })
    const list = await (await getSessions()).json()
    expect(list).toHaveLength(0)
  })
})
