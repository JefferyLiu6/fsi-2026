'use client'

import Link from 'next/link'

export default function LoginPage() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>

        {/* Wordmark */}
        <Link href="/" style={{ display: 'inline-block', marginBottom: 40, textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            LinguaFlow
          </span>
          <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.8125rem', color: 'var(--text-3)', marginLeft: 8 }}>
            Language Training
          </span>
        </Link>

        <h1 style={{
          fontFamily: 'var(--font-fraunces), sans-serif',
          fontWeight: 600,
          fontSize: '1.75rem',
          letterSpacing: '-0.03em',
          color: 'var(--text-1)',
          marginBottom: 12,
          lineHeight: 1.2,
        }}>
          Demo version.
        </h1>

        <p style={{
          fontFamily: 'var(--font-manrope), sans-serif',
          fontSize: '0.9375rem',
          color: 'var(--text-2)',
          lineHeight: 1.6,
          marginBottom: 36,
        }}>
          No account needed. Your results are stored locally in this browser.
        </p>

        <Link
          href="/drill"
          style={{
            display: 'inline-block',
            background: 'var(--text-1)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 600,
            fontSize: '0.9375rem',
            padding: '12px 32px',
            textDecoration: 'none',
            borderRadius: 4,
            letterSpacing: '-0.01em',
          }}
        >
          Try without login
        </Link>

        <div style={{ marginTop: 32, fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.625rem', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
          20s per item · errors shown immediately · no partial credit
        </div>

      </div>
    </div>
  )
}
