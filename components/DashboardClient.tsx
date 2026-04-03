'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadSessions, computeStats } from '@/lib/stats'
import type { SessionRecord, Language } from '@/lib/drills'
import { LANGUAGES } from '@/lib/drills'

// ── Helpers ───────────────────────────────────────────────────────

function gradeColor(pct: number): string {
  return pct >= 80 ? 'var(--correct)' : pct >= 60 ? 'var(--timeout)' : 'var(--incorrect)'
}

function trendCls(delta: number): string {
  return delta >= 0 ? 'text-green-600' : 'text-red-600'
}

function trendLabel(delta: number, unit = ''): string {
  return (delta >= 0 ? '+' : '') + delta.toFixed(1) + unit
}

function heatColor(count: number): string {
  if (count === 0)  return '#f3f4f6'  // gray-100
  if (count <= 5)   return '#cbd5e1'  // slate-300
  if (count <= 15)  return '#94a3b8'  // slate-400
  if (count <= 30)  return '#64748b'  // slate-500
  return '#334155'                     // slate-700
}

// ── Component ────────────────────────────────────────────────────

export default function DashboardClient() {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loaded, setLoaded]     = useState(false)
  const [filterLang, setFilterLang] = useState<Language | 'all'>('all')

  useEffect(() => {
    loadSessions().then(data => { setSessions(data); setLoaded(true) })
  }, [])

  if (!loaded) return null

  const usedLangs = Array.from(new Set(sessions.map(s => s.language).filter(Boolean))) as Language[]
  const filtered  = filterLang === 'all' ? sessions : sessions.filter(s => s.language === filterLang)
  const stats     = computeStats(filtered)

  // ── No sessions at all ────────────────────────────────────────
  if (sessions.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 32px' }}>
        <div>
          <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: '1.5rem', color: 'var(--text-1)', marginBottom: 12, letterSpacing: '-0.03em' }}>
            No data yet.
          </h2>
          <p style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 32 }}>
            Complete at least one session to view performance data.
          </p>
          <Link href="/drill" style={{ display: 'inline-block', background: 'var(--text-1)', color: 'var(--bg)', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: '0.875rem', padding: '11px 22px', textDecoration: 'none', borderRadius: 4, letterSpacing: '-0.01em' }}>
            Start Training
          </Link>
        </div>
      </div>
    )
  }

  // ── Shared header (always shown when sessions exist) ──────────
  const LangHeader = () => (
    <div className="border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-8 pt-10 pb-9">
        <div className="flex items-end justify-between">
          <div>
            <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
              Performance Report · {filterLang === 'all' ? 'All Languages' : `EN → ${LANGUAGES[filterLang].name}`}
            </div>
            <h1 style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.03em', color: 'var(--text-1)', lineHeight: 1.1 }}>
              Training Results
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {usedLangs.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <button onClick={() => setFilterLang('all')} style={{ background: filterLang === 'all' ? 'var(--text-1)' : 'var(--bg)', color: filterLang === 'all' ? 'var(--bg)' : 'var(--text-2)', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: filterLang === 'all' ? 600 : 400, fontSize: '0.8125rem', padding: '7px 14px', border: 'none', cursor: 'pointer' }}>All</button>
                {usedLangs.map(lang => (
                  <button key={lang} onClick={() => setFilterLang(lang)} style={{ background: filterLang === lang ? 'var(--text-1)' : 'var(--bg)', color: filterLang === lang ? 'var(--bg)' : 'var(--text-2)', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: filterLang === lang ? 600 : 400, fontSize: '0.8125rem', padding: '7px 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{LANGUAGES[lang].flag}</span><span>{LANGUAGES[lang].name}</span>
                  </button>
                ))}
              </div>
            )}
            <Link href="/drill" style={{ display: 'inline-block', background: 'var(--text-1)', color: 'var(--bg)', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: '0.875rem', padding: '10px 20px', textDecoration: 'none', borderRadius: 4, letterSpacing: '-0.01em' }}>
              New Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  // ── No data for the selected filter ──────────────────────────
  if (!stats) {
    return (
      <div style={{ flex: 1 }}>
        <LangHeader />
        <div className="max-w-[1200px] mx-auto px-8 py-20" style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.875rem', color: 'var(--text-3)' }}>
          No sessions for {LANGUAGES[filterLang as Language]?.name ?? 'this language'} yet.
        </div>
      </div>
    )
  }

  // ── Analytics derivations ─────────────────────────────────────

  const byDate    = [...filtered].sort((a, b) => b.date - a.date)
  const allResults = byDate.flatMap(s => s.results)

  // Rolling accuracy: last 50 vs previous 50
  const roll50    = allResults.slice(0, 50)
  const prev50    = allResults.slice(50, 100)
  const rollAcc   = roll50.length > 0 ? Math.round(roll50.filter(r => r.correct).length / roll50.length * 100) : 0
  const prevAcc   = prev50.length > 0 ? Math.round(prev50.filter(r => r.correct).length / prev50.length * 100) : 0
  const accDelta  = prev50.length > 0 ? rollAcc - prevAcc : 0

  // Avg time trend: last 5 sessions vs previous 5
  const last5    = byDate.slice(0, 5)
  const prev5    = byDate.slice(5, 10)
  const last5Avg = last5.length > 0 ? Math.round(last5.reduce((a, s) => a + s.avgTime, 0) / last5.length * 10) / 10 : stats.avgTime
  const prev5Avg = prev5.length > 0 ? Math.round(prev5.reduce((a, s) => a + s.avgTime, 0) / prev5.length * 10) / 10 : 0
  const timeDelta = prev5.length > 0 ? Math.round((last5Avg - prev5Avg) * 10) / 10 : 0

  // Retention rate: 2nd+ encounters
  const itemLog: Record<string, boolean[]> = {}
  byDate.forEach(s => s.results.forEach(r => {
    if (!itemLog[r.item.id]) itemLog[r.item.id] = []
    itemLog[r.item.id].push(r.correct)
  }))
  const reHits = Object.values(itemLog).filter(a => a.length >= 2).flatMap(a => a.slice(1))
  const retRate = reHits.length > 0 ? Math.round(reHits.filter(Boolean).length / reHits.length * 100) : null

  // Error ledger: recent wrong answers
  const errorLedger = byDate.flatMap(s =>
    s.results
      .filter(r => !r.correct && !r.skipped)
      .map(r => ({ ...r, sessionDate: s.date, drillType: s.drillType }))
  ).slice(0, 12)

  // Streak: consecutive days with at least one session
  const todayMs  = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const DAY_MS   = 86_400_000
  const daySet   = new Set(
    filtered.map(s => { const d = new Date(s.date); d.setHours(0,0,0,0); return d.getTime() })
  )
  // Start from today if trained today, else from yesterday (streak stays alive until EOD)
  let streakCount = 0
  let cursor = daySet.has(todayMs) ? todayMs : todayMs - DAY_MS
  while (daySet.has(cursor)) { streakCount++; cursor -= DAY_MS }
  const trainedToday = daySet.has(todayMs)

  // Heatmap: 84 days (12 weeks × 7)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dayBuckets: Record<string, number> = {}
  filtered.forEach(s => {
    const d = new Date(s.date); d.setHours(0, 0, 0, 0)
    const k = d.toISOString().slice(0, 10)
    dayBuckets[k] = (dayBuckets[k] ?? 0) + s.total
  })
  const heatDays = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (83 - i))
    const k = d.toISOString().slice(0, 10)
    return { key: k, count: dayBuckets[k] ?? 0 }
  })

  // Type breakdown
  const typeStats: Record<string, { correct: number; total: number }> = {}
  filtered.forEach(s => s.results.forEach(r => {
    if (!typeStats[r.item.type]) typeStats[r.item.type] = { correct: 0, total: 0 }
    typeStats[r.item.type].total++
    if (r.correct) typeStats[r.item.type].correct++
  }))

  // KPI definitions
  const kpis = [
    {
      label: 'Rolling Accuracy',
      sub:   'last 50 items',
      value: `${rollAcc}%`,
      trend: prev50.length > 0 ? { delta: accDelta, unit: 'pp' } : null,
    },
    {
      label: 'Avg. Response',
      sub:   'last 5 sessions',
      value: `${last5Avg}s`,
      // lower is better: invert sign for trend display
      trend: prev5.length > 0 ? { delta: -timeDelta, unit: 's' } : null,
    },
    {
      label: 'Total Items',
      sub:   `across ${stats.sessions} sessions`,
      value: stats.total.toLocaleString(),
      trend: null,
    },
    {
      label: 'Retention Rate',
      sub:   're-encountered items',
      value: retRate !== null ? `${retRate}%` : '—',
      trend: null,
    },
    {
      label: 'Day Streak',
      sub:   trainedToday ? 'trained today ✓' : 'train today to extend',
      value: `${streakCount}d`,
      trend: null,
    },
  ]

  return (
    <div style={{ flex: 1 }}>
      <LangHeader />

      <div className="max-w-[1200px] mx-auto px-8 py-10 pb-24">

        {/* ── 1. KPI Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {kpis.map(({ label, sub, value, trend }) => {
            const isStreak  = label === 'Day Streak'
            const isActive  = isStreak && trainedToday
            const isBroken  = isStreak && !trainedToday && streakCount === 0
            return (
            <div
              key={label}
              className="bg-white border shadow-sm rounded-lg p-6"
              style={{
                borderColor: isActive ? '#d97706' : '#e5e7eb',
                borderTopWidth: isStreak ? 3 : 1,
                borderTopColor: isActive ? '#d97706' : isStreak ? '#e5e7eb' : undefined,
              }}
            >
              <div className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">{label}</div>
              <div className="text-[10px] mb-3" style={{ fontFamily: 'var(--font-jetbrains), monospace', color: isActive ? '#d97706' : '#9ca3af' }}>{sub}</div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span style={{
                  fontFamily: 'var(--font-fraunces), sans-serif',
                  fontSize: '2.25rem',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  fontWeight: 500,
                  color: isActive ? '#d97706' : isBroken ? 'var(--text-3)' : 'var(--text-1)',
                }}>
                  {value}
                </span>
                {trend && (
                  <span className={`text-sm font-medium ${trendCls(trend.delta)}`}>
                    {trendLabel(trend.delta, trend.unit)}
                  </span>
                )}
              </div>
            </div>
          )})}
        </div>

        {/* ── 2. Charts Row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Speed vs. Accuracy — col-span-2 */}
          <div className="lg:col-span-2 bg-white border border-gray-200 shadow-sm rounded-lg p-6">
            <div className="border-b border-gray-100 pb-4 mb-5">
              <div className="text-sm uppercase tracking-wider text-gray-900 font-semibold">Speed vs. Accuracy</div>
              <div className="text-[10px] text-gray-400 mt-1" style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                Response time (s) × correctness — {Math.min(allResults.length, 60)} items plotted
              </div>
            </div>
            <div className="relative min-h-[260px] rounded-md overflow-hidden bg-gray-50 border border-gray-100">
              {/* Grid */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="scatter-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#scatter-grid)" />
              </svg>
              {/* Y-axis labels */}
              <div className="absolute left-2 top-3 bottom-7 flex flex-col justify-between pointer-events-none">
                {['100%', '75%', '50%', '25%', '0%'].map(t => (
                  <span key={t} style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: '#9ca3af' }}>{t}</span>
                ))}
              </div>
              {/* X-axis labels */}
              <div className="absolute bottom-2 left-10 right-4 flex justify-between pointer-events-none">
                {['0s', '1s', '2s', '3s', '4s', '5s+'].map(t => (
                  <span key={t} style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: '#9ca3af' }}>{t}</span>
                ))}
              </div>
              {/* Correct / Incorrect zone labels */}
              <div className="absolute right-3 top-3" style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: 'var(--correct)', opacity: 0.7 }}>CORRECT</div>
              <div className="absolute right-3 bottom-8" style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: 'var(--incorrect)', opacity: 0.7 }}>INCORRECT</div>
              {/* Data dots — deterministic jitter via index */}
              {allResults.slice(0, 60).map((r, i) => {
                const xPct = Math.min(r.timeUsed / 5000, 0.95)
                // jitter: deterministic pseudo-random from index
                const jitter = ((i * 17 + 3) % 100) / 100 * 0.18
                const yPct   = r.correct ? 0.06 + jitter : 0.65 + jitter
                return (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left:    `${10 + xPct * 82}%`,
                      top:     `${yPct * 85}%`,
                      background: r.correct ? 'var(--correct)' : 'var(--incorrect)',
                      opacity: 0.55,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Training Intensity — col-span-1 */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
            <div className="border-b border-gray-100 pb-4 mb-5">
              <div className="text-sm uppercase tracking-wider text-gray-900 font-semibold">Training Intensity</div>
              <div className="text-[10px] text-gray-400 mt-1" style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>12-week activity · items drilled per day</div>
            </div>
            {/* Month strip */}
            <div className="grid gap-[3px] mb-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
              {Array.from({ length: 12 }, (_, w) => {
                const d = new Date(today); d.setDate(today.getDate() - (11 - w) * 7)
                return (
                  <span key={w} style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '8px', color: '#9ca3af', textAlign: 'center', display: 'block' }}>
                    {d.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                )
              })}
            </div>
            {/* Grid: 7 rows × 12 cols */}
            <div>
              {Array.from({ length: 7 }, (_, dow) => (
                <div key={dow} className="flex gap-[3px] mb-[3px]">
                  {Array.from({ length: 12 }, (_, wk) => {
                    const idx  = wk * 7 + dow
                    const cell = heatDays[idx]
                    if (!cell) return <div key={wk} className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#f3f4f6' }} />
                    return (
                      <div
                        key={wk}
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        title={`${cell.key}: ${cell.count} items`}
                        style={{ background: heatColor(cell.count) }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-4">
              <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: '#9ca3af', marginRight: 2 }}>Less</span>
              {[0, 5, 15, 30, 50].map(v => (
                <div key={v} className="w-3 h-3 rounded-sm" style={{ background: heatColor(v) }} />
              ))}
              <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: '#9ca3af', marginLeft: 2 }}>More</span>
            </div>
          </div>
        </div>

        {/* ── 3. Error Ledger ─────────────────────────────────────── */}
        {errorLedger.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden mb-8">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="text-sm uppercase tracking-wider text-gray-900 font-semibold">Error Ledger</div>
              <div className="text-[10px] text-gray-400 mt-1" style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                Recent deviations · {errorLedger.length} entries · sorted by session date
              </div>
            </div>
            <table className="w-full text-left" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '7rem' }} />
                <col style={{ width: '6.5rem' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '4.5rem' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  {['DATE', 'TYPE', 'CUE', 'EXPECTED', 'ACTUAL', 'TIME'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {errorLedger.map((r, i) => {
                  const d       = new Date(r.sessionDate)
                  const dateFmt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const timeFmt = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      {/* DATE */}
                      <td className="px-4 py-3">
                        <span className="leading-tight text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: 'var(--font-jetbrains), monospace', display: 'block' }}>
                          {dateFmt}<br />{timeFmt}
                        </span>
                      </td>
                      {/* TYPE */}
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-600 rounded px-2 py-0.5 text-xs font-medium capitalize">
                          {r.drillType}
                        </span>
                      </td>
                      {/* CUE */}
                      <td className="px-4 py-3 overflow-hidden" style={{ maxWidth: 0 }}>
                        <span className="font-mono text-sm text-gray-900 font-medium block truncate">
                          {r.item.prompt}
                        </span>
                      </td>
                      {/* EXPECTED */}
                      <td className="px-4 py-3 overflow-hidden" style={{ maxWidth: 0 }}>
                        <span className="font-mono text-sm text-gray-900 font-medium block truncate">
                          {r.item.answer}
                        </span>
                      </td>
                      {/* ACTUAL */}
                      <td className="px-4 py-3 overflow-hidden" style={{ maxWidth: 0 }}>
                        {r.userAnswer ? (
                          <span className="font-mono text-sm text-red-800 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded inline-block max-w-full truncate">
                            {r.userAnswer}
                          </span>
                        ) : (
                          <span className="text-xs italic text-gray-300">—</span>
                        )}
                      </td>
                      {/* TIME */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500 tabular-nums block text-right">
                          {(r.timeUsed / 1000).toFixed(1)}s
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 4. Accuracy by Type + Session History ───────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Accuracy by type */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
            <div className="border-b border-gray-100 pb-4 mb-5">
              <div className="text-sm uppercase tracking-wider text-gray-900 font-semibold">Accuracy by Type</div>
              <div className="text-[10px] text-gray-400 mt-1" style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>All sessions combined</div>
            </div>
            <div className="flex flex-col gap-5">
              {Object.entries(typeStats).map(([type, { correct, total }]) => {
                const pct = Math.round(correct / total * 100)
                return (
                  <div key={type}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm text-gray-600 capitalize font-medium">{type}</span>
                      <span style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: '1rem', color: gradeColor(pct), letterSpacing: '-0.02em' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: gradeColor(pct) }} />
                    </div>
                    <div className="mt-1" style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: '#9ca3af' }}>
                      {correct}/{total} correct
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Session history */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
            <div className="border-b border-gray-100 pb-4 mb-5">
              <div className="text-sm uppercase tracking-wider text-gray-900 font-semibold">Session History</div>
              <div className="text-[10px] text-gray-400 mt-1" style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>Most recent {Math.min(byDate.length, 8)} sessions</div>
            </div>
            <div className="flex flex-col divide-y divide-gray-100">
              {byDate.slice(0, 8).map(s => {
                const d     = new Date(s.date)
                const dateFmt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeFmt = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-14 shrink-0" style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: '#9ca3af', lineHeight: 1.6 }}>
                      {dateFmt}<br />{timeFmt}
                    </div>
                    <div className="flex-1 text-sm text-gray-500 capitalize truncate">{s.drillType}</div>
                    {filterLang === 'all' && s.language && (
                      <div className="text-sm">{LANGUAGES[s.language]?.flag}</div>
                    )}
                    <div style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: '1rem', color: gradeColor(s.accuracy), letterSpacing: '-0.02em', width: 44, textAlign: 'right' }}>
                      {s.accuracy}%
                    </div>
                    <div className="w-10 text-right" style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '9px', color: '#9ca3af' }}>
                      {s.correct}/{s.total}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
