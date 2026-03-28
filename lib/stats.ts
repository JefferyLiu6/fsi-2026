import type { SessionRecord, DrillItem, Language } from './drills'

// ── Sessions ─────────────────────────────────────────────────────
const PENDING_KEY = 'fsi_pending_sessions'

function getPending(): SessionRecord[] {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? '[]') } catch { return [] }
}
function setPending(list: SessionRecord[]) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    const res = await fetch('/api/sessions')
    if (!res.ok) return []
    const apiSessions: SessionRecord[] = await res.json()
    // Merge any optimistic sessions not yet confirmed by the API
    const apiIds   = new Set(apiSessions.map(s => s.id))
    const pending  = getPending().filter(s => !apiIds.has(s.id))
    setPending(pending) // prune confirmed entries
    return pending.length > 0 ? [...pending, ...apiSessions] : apiSessions
  } catch { return [] }
}

export function saveSession(session: SessionRecord): void {
  // 1. Write optimistically to sessionStorage — dashboard can use it immediately
  setPending([session, ...getPending()])
  // 2. Persist to the server in the background
  fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  }).then(r => {
    if (r.ok) {
      // Prune once confirmed
      setPending(getPending().filter(s => s.id !== session.id))
    }
  }).catch(() => { /* silent fail */ })
}

// ── Language ─────────────────────────────────────────────────────
export async function loadLanguage(): Promise<Language> {
  try {
    const res = await fetch('/api/language')
    if (!res.ok) return 'es'
    const data = await res.json()
    return (data.language as Language) ?? 'es'
  } catch { return 'es' }
}

export async function saveLanguage(lang: Language): Promise<void> {
  try {
    await fetch('/api/language', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    })
  } catch { /* silent fail */ }
}

// ── Custom List ───────────────────────────────────────────────────
export async function loadCustomList(): Promise<DrillItem[]> {
  try {
    const res = await fetch('/api/custom-list')
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch { return [] }
}

export async function saveCustomList(items: DrillItem[]): Promise<void> {
  try {
    await fetch('/api/custom-list', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
  } catch { /* silent fail */ }
}

export async function clearCustomList(): Promise<void> {
  try {
    await fetch('/api/custom-list', { method: 'DELETE' })
  } catch { /* silent fail */ }
}

// ── Stats (pure computation, no I/O) ─────────────────────────────
export function computeStats(sessions: SessionRecord[]) {
  if (sessions.length === 0) return null
  const total   = sessions.reduce((a, s) => a + s.total, 0)
  const correct = sessions.reduce((a, s) => a + s.correct, 0)
  const avgTime = sessions.reduce((a, s) => a + s.avgTime, 0) / sessions.length
  return {
    sessions: sessions.length,
    total,
    correct,
    accuracy: total > 0 ? Math.round(correct / total * 100) : 0,
    avgTime:  Math.round(avgTime * 10) / 10,
  }
}
