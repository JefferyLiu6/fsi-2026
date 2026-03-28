'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LANGUAGES } from '@/lib/drills'
import type { Language } from '@/lib/drills'
import { loadLanguage, loadSessions } from '@/lib/stats'

export function Nav() {
  const path = usePathname()
  const router = useRouter()
  const [lang, setLang]   = useState<Language>('es')
  const [user, setUser]   = useState<{ email: string; name?: string } | null>(null)
  const [streak, setStreak] = useState<number>(0)

  useEffect(() => {
    loadLanguage().then(l => setLang(l))
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data?.email) setUser({ email: data.email, name: data.name })
      else setUser(null)
    }).catch(() => {})
    loadSessions().then(sessions => {
      const DAY_MS  = 86_400_000
      const todayMs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
      const daySet  = new Set(sessions.map(s => { const d = new Date(s.date); d.setHours(0,0,0,0); return d.getTime() }))
      let count  = 0
      let cursor = daySet.has(todayMs) ? todayMs : todayMs - DAY_MS
      while (daySet.has(cursor)) { count++; cursor -= DAY_MS }
      setStreak(count)
    })
  }, [path])

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setStreak(0)
    router.push('/login')
    router.refresh()
  }

  const displayName = user?.name ?? user?.email ?? ''
  const truncated = displayName.length > 20 ? displayName.slice(0, 18) + '\u2026' : displayName

  return (
    <nav
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
        }}
      >
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-4 no-underline">
          {/* Brand logo */}
          <div className="flex items-center gap-2">
            <svg
              width="24" height="24" viewBox="0 0 24 24"
              fill="currentColor" aria-hidden="true"
              className="text-[#2DD4BF] shrink-0"
            >
              <rect x="1"  y="14" width="3" height="6"  rx="1" />
              <rect x="6"  y="9"  width="3" height="11" rx="1" />
              <rect x="11" y="4"  width="3" height="16" rx="1" />
              <rect x="16" y="7"  width="3" height="13" rx="1" />
              <rect x="21" y="12" width="3" height="8"  rx="1" />
            </svg>
            <span className="text-xl font-display font-bold text-gray-900 tracking-tighter">
              FSI
            </span>
          </div>

        </Link>

        {/* Nav links + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[
            { href: '/drill', label: 'Train' },
            { href: '/library', label: 'Library' },
            { href: '/study', label: 'Study' },
            { href: '/dashboard', label: 'Results' },
          ].map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 4,
                  background: active ? 'var(--surface-2)' : 'transparent',
                }}
              >
                {label}
              </Link>
            )
          })}

          {/* Streak badge */}
          {streak > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginLeft: 8,
                marginRight: 4,
              }}
            >
              <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>🔥</span>
              <span
                style={{
                  fontFamily: 'var(--font-fraunces), sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: '#d97706',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {streak}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-jetbrains), monospace',
                  fontSize: '0.5625rem',
                  color: '#d97706',
                  opacity: 0.7,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                day{streak !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {user && (
            <>
              <span
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontSize: '0.75rem',
                  color: 'var(--text-3)',
                  padding: '0 8px',
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {truncated}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  color: 'var(--text-2)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  marginLeft: 4,
                }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
