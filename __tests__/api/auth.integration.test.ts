/**
 * Integration tests for the authentication API flow.
 *
 * Strategy: real bcrypt (cost 1 for speed) + real JWT; Prisma and
 * next/headers are replaced with lightweight in-process fakes so no
 * database process or Next.js runtime is needed.
 */
import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest'

// ── In-memory Prisma fake ─────────────────────────────────────────────────────

type UserRow = { id: string; email: string; password: string; name: string | null }
const _users = new Map<string, UserRow>()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(({ where: { email } }: { where: { email: string } }) =>
        Promise.resolve(_users.get(email) ?? null)
      ),
      create: vi.fn(({ data }: { data: Omit<UserRow, 'id'> }) => {
        const row: UserRow = { id: `uid-${_users.size + 1}`, ...data }
        _users.set(data.email, row)
        return Promise.resolve(row)
      }),
    },
  },
}))

// ── Cookie jar (simulates httpOnly session cookie) ────────────────────────────

const _jar: Record<string, string> = {}

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: () => undefined,
  })),
  cookies: vi.fn(() => ({
    get:    (n: string) => _jar[n] ? { name: n, value: _jar[n] } : undefined,
    set:    (n: string, v: string) => { _jar[n] = v },
    delete: (n: string) => { delete _jar[n] },
  })),
}))

// ── Lower bcrypt cost so tests finish in < 1 s ────────────────────────────────

vi.mock('bcryptjs', async () => {
  const real = await vi.importActual<typeof import('bcryptjs')>('bcryptjs')
  return { ...real, hash: (p: string) => real.hash(p, 1) }
})

// ── Route handlers (imported AFTER mocks are hoisted) ────────────────────────

import { POST as register } from '@/app/api/register/route'
import { POST as login    } from '@/app/api/auth/login/route'
import { GET  as me       } from '@/app/api/auth/me/route'

// ─────────────────────────────────────────────────────────────────────────────

const json = (body: unknown) =>
  new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeAll(() => {
  process.env.JWT_SECRET = 'integration-test-secret-at-least-32-chars!'
})

beforeEach(() => {
  _users.clear()
  for (const k of Object.keys(_jar)) delete _jar[k]
})

// ── Register ─────────────────────────────────────────────────────────────────

describe('POST /api/register', () => {
  it('creates a user and returns { ok: true }', async () => {
    const res = await register(json({ email: 'a@test.com', password: 'password1', name: 'Alice' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('rejects a duplicate email with 409', async () => {
    await register(json({ email: 'a@test.com', password: 'password1' }))
    const res = await register(json({ email: 'a@test.com', password: 'password2' }))
    expect(res.status).toBe(409)
  })

  it('rejects a short password with 400', async () => {
    const res = await register(json({ email: 'b@test.com', password: 'short' }))
    expect(res.status).toBe(400)
  })

  it('rejects missing fields with 400', async () => {
    const res = await register(json({ email: 'c@test.com' }))
    expect(res.status).toBe(400)
  })
})

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('sets a session cookie on valid credentials', async () => {
    await register(json({ email: 'u@test.com', password: 'validPass1', name: 'User' }))
    const res = await login(json({ email: 'u@test.com', password: 'validPass1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, user: { email: 'u@test.com' } })
    expect(_jar['fsi_auth']).toBeTruthy()
  })

  it('returns 401 for a wrong password', async () => {
    await register(json({ email: 'u@test.com', password: 'validPass1' }))
    const res = await login(json({ email: 'u@test.com', password: 'wrongPass1' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 for an unknown email', async () => {
    const res = await login(json({ email: 'nobody@test.com', password: 'validPass1' }))
    expect(res.status).toBe(401)
  })
})

// ── Full flow: register → login → /me ─────────────────────────────────────────

describe('Auth flow', () => {
  it('GET /api/auth/me returns null when not logged in', async () => {
    const res = await me()
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })

  it('GET /api/auth/me returns the session after login', async () => {
    await register(json({ email: 'full@test.com', password: 'validPass1', name: 'Full' }))
    await login(json({ email: 'full@test.com', password: 'validPass1' }))

    const res = await me()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ email: 'full@test.com', name: 'Full' })
    expect(body.userId).toBeTruthy()
  })
})
