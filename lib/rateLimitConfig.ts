function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const RATE_LIMIT = {
  windows: {
    minuteMs: 60_000,
    dayMs: 86_400_000,
    resetBurstMs: 15_000,
  },
  ai: {
    globalDaily: intFromEnv('DEMO_AI_GLOBAL_DAILY_LIMIT', 120),
    generate: {
      sessionMinute: intFromEnv('DEMO_GEN_SESSION_MINUTE_LIMIT', 4),
      sessionDaily: intFromEnv('DEMO_GEN_SESSION_DAILY_LIMIT', 20),
      ipMinute: intFromEnv('DEMO_GEN_IP_MINUTE_LIMIT', 20),
      ipDaily: intFromEnv('DEMO_GEN_IP_DAILY_LIMIT', 40),
    },
    tutor: {
      sessionMinute: intFromEnv('DEMO_TUTOR_SESSION_MINUTE_LIMIT', 10),
      sessionDaily: intFromEnv('DEMO_TUTOR_SESSION_DAILY_LIMIT', 20),
      ipMinute: intFromEnv('DEMO_TUTOR_IP_MINUTE_LIMIT', 60),
      ipDaily: intFromEnv('DEMO_TUTOR_IP_DAILY_LIMIT', 40),
    },
  },
  reset: {
    sessionBurst: intFromEnv('DEMO_RESET_SESSION_BURST_LIMIT', 1),
    sessionDaily: intFromEnv('DEMO_RESET_SESSION_DAILY_LIMIT', 20),
    ipDaily: intFromEnv('DEMO_RESET_IP_DAILY_LIMIT', 100),
  },
} as const

