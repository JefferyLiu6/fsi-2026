'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Check if already logged in
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data?.email) router.replace('/drill')
    })
  }, [router])

  const from = searchParams.get('from') ?? '/drill'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push(from)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const regRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const regData = await regRes.json()
      if (!regRes.ok) { setError(regData.error); return }

      // Auto-login after register
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (loginRes.ok) {
        router.push('/drill')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Wordmark */}
        <Link href="/" style={{ display: 'inline-block', marginBottom: 40, textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            FSI
          </span>
          <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.8125rem', color: 'var(--text-3)', marginLeft: 8 }}>
            Language Training
          </span>
        </Link>

        {/* Heading */}
        <h1 style={{
          fontFamily: 'var(--font-fraunces), sans-serif',
          fontWeight: 600,
          fontSize: '1.75rem',
          letterSpacing: '-0.03em',
          color: 'var(--text-1)',
          marginBottom: 28,
          lineHeight: 1.2,
        }}>
          {tab === 'login' ? 'Sign in to continue.' : 'Create your account.'}
        </h1>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', marginBottom: 28 }}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                background: tab === t ? 'var(--surface-3)' : 'var(--surface-1)',
                color: tab === t ? 'var(--text-1)' : 'var(--text-2)',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: tab === t ? 600 : 400,
                fontSize: '0.875rem',
                padding: '11px 16px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
          {tab === 'register' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 6 }}>
                Name <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: '100%',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 4,
                  color: 'var(--text-1)',
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontSize: '0.9375rem',
                  padding: '10px 14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: '100%',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-mid)',
                borderRadius: 4,
                color: 'var(--text-1)',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontSize: '0.9375rem',
                padding: '10px 14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 6 }}>
              Password {tab === 'register' && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(min. 8 characters)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              style={{
                width: '100%',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-mid)',
                borderRadius: 4,
                color: 'var(--text-1)',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontSize: '0.9375rem',
                padding: '10px 14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontSize: '0.8125rem',
              color: 'var(--incorrect)',
              marginBottom: 16,
              padding: '10px 14px',
              background: 'var(--incorrect-dim)',
              borderLeft: '2px solid var(--incorrect)',
              borderRadius: '0 4px 4px 0',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'var(--surface-2)' : 'var(--text-1)',
              color: loading ? 'var(--text-3)' : 'var(--bg)',
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 600,
              fontSize: '0.9375rem',
              padding: '12px',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            {loading ? 'Please wait\u2026' : tab === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 24, fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.625rem', letterSpacing: '0.06em', color: 'var(--text-3)', textAlign: 'center' }}>
          20s per item · errors shown immediately · no partial credit
        </div>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-manrope), sans-serif', color: 'var(--text-3)', fontSize: '0.875rem' }}>Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
