import type { SessionRecord, DrillItem, Language } from './drills'

// ── localStorage helpers ──────────────────────────────────────────
const SESSIONS_KEY = 'linguaflow_demo_sessions'
const LANGUAGE_KEY = 'linguaflow_demo_language'
const CUSTOM_KEY   = 'linguaflow_demo_custom_list'

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)) } catch { return fallback }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

// ── Sessions ─────────────────────────────────────────────────────
export async function loadSessions(): Promise<SessionRecord[]> {
  return getStorage<SessionRecord[]>(SESSIONS_KEY, [])
}

export function saveSession(session: SessionRecord): void {
  const existing = getStorage<SessionRecord[]>(SESSIONS_KEY, [])
  setStorage(SESSIONS_KEY, [session, ...existing])
}

// ── Language ─────────────────────────────────────────────────────
export async function loadLanguage(): Promise<Language> {
  return getStorage<Language>(LANGUAGE_KEY, 'es')
}

export async function saveLanguage(lang: Language): Promise<void> {
  setStorage(LANGUAGE_KEY, lang)
}

// ── Custom List ───────────────────────────────────────────────────
export async function loadCustomList(): Promise<DrillItem[]> {
  return getStorage<DrillItem[]>(CUSTOM_KEY, [])
}

export async function saveCustomList(items: DrillItem[]): Promise<void> {
  setStorage(CUSTOM_KEY, items)
}

export async function clearCustomList(): Promise<void> {
  setStorage(CUSTOM_KEY, [])
}

export function resetDemoLocalState(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSIONS_KEY)
    localStorage.removeItem(LANGUAGE_KEY)
    localStorage.removeItem(CUSTOM_KEY)
  } catch {
    // Ignore storage errors in demo mode reset.
  }
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
