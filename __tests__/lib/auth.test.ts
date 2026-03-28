import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock next/headers before importing lib/auth (it only uses cookies() at runtime,
// but importing the module would otherwise fail outside a Next.js context)
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { signToken, verifyToken } from '@/lib/auth'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!'
})

describe('signToken / verifyToken', () => {
  it('round-trips a payload', async () => {
    const payload = { userId: 'u1', email: 'a@b.com', name: 'Alice' }
    const token = await signToken(payload)
    const result = await verifyToken(token)
    expect(result?.userId).toBe('u1')
    expect(result?.email).toBe('a@b.com')
    expect(result?.name).toBe('Alice')
  })

  it('returns null for a tampered token', async () => {
    const token = await signToken({ userId: 'u2', email: 'x@y.com' })
    const tampered = token.slice(0, -4) + 'XXXX'
    expect(await verifyToken(tampered)).toBeNull()
  })

  it('returns null for an empty string', async () => {
    expect(await verifyToken('')).toBeNull()
  })

  it('throws when JWT_SECRET is missing', async () => {
    const saved = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    await expect(signToken({ userId: 'u', email: 'e@e.com' })).rejects.toThrow('JWT_SECRET not set')
    process.env.JWT_SECRET = saved
  })
})
