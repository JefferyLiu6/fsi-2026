import { describe, it, expect } from 'vitest'
import {
  LANGUAGES, TOPICS,
  getDB, shuffle, buildItems, normalizeAnswer, checkAnswer,
} from '@/lib/drills'
import type { Language, DrillItem } from '@/lib/drills'

const LANGS = Object.keys(LANGUAGES) as Language[]

// ── getDB ─────────────────────────────────────────────────────────────────────

describe('getDB', () => {
  it('returns a non-empty array for every language', () => {
    for (const lang of LANGS) {
      const items = getDB(lang)
      expect(items.length).toBeGreaterThan(0)
    }
  })

  it('every item has required fields', () => {
    for (const lang of LANGS) {
      for (const item of getDB(lang)) {
        expect(item.id).toBeTruthy()
        expect(['translation', 'substitution', 'transformation']).toContain(item.type)
        expect(item.prompt).toBeTruthy()
        expect(item.answer).toBeTruthy()
        expect(item.promptLang).toBeTruthy()
      }
    }
  })

  it('all item ids are unique within a language', () => {
    for (const lang of LANGS) {
      const ids = getDB(lang).map(d => d.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('topic values, when present, are valid TOPICS keys', () => {
    const validTopics = new Set(Object.keys(TOPICS))
    for (const lang of LANGS) {
      for (const item of getDB(lang)) {
        if (item.topic) expect(validTopics.has(item.topic)).toBe(true)
      }
    }
  })
})

// ── shuffle ───────────────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('returns the same elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input)
    expect(result).toHaveLength(input.length)
    expect(result.sort()).toEqual([...input].sort())
  })

  it('does not mutate the original array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffle(input)
    expect(input).toEqual(copy)
  })

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle([42])).toEqual([42])
  })
})

// ── buildItems ────────────────────────────────────────────────────────────────

describe('buildItems', () => {
  it('respects the count limit', () => {
    const items = buildItems('mixed', 5, 'es')
    expect(items.length).toBeLessThanOrEqual(5)
  })

  it('returns only translation items for type=translation', () => {
    const items = buildItems('translation', 20, 'es')
    expect(items.every(d => d.type === 'translation')).toBe(true)
  })

  it('returns only substitution items for type=substitution', () => {
    const items = buildItems('substitution', 20, 'es')
    expect(items.every(d => d.type === 'substitution')).toBe(true)
  })

  it('returns only vocab items for type=vocab', () => {
    const items = buildItems('vocab', 20, 'es')
    expect(items.every(d => d.category === 'vocab')).toBe(true)
  })

  it('filters by topic when provided', () => {
    const items = buildItems('mixed', 50, 'es', undefined, 'travel')
    expect(items.every(d => d.topic === 'travel')).toBe(true)
  })

  it('returns empty array for custom type with no customItems', () => {
    expect(buildItems('custom', 5, 'es')).toEqual([])
  })

  it('returns custom items shuffled and capped at count', () => {
    const custom: DrillItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`, type: 'translation', instruction: 'x', prompt: `p${i}`,
      answer: `a${i}`, promptLang: 'en-US',
    }))
    const result = buildItems('custom', 5, 'es', custom)
    expect(result).toHaveLength(5)
  })
})

// ── normalizeAnswer ───────────────────────────────────────────────────────────

describe('normalizeAnswer', () => {
  it('lowercases and trims', () => {
    expect(normalizeAnswer('  Buenos Días  ')).toBe('buenos días')
  })

  it('strips trailing punctuation', () => {
    expect(normalizeAnswer('buenos días.')).toBe('buenos días')
    expect(normalizeAnswer('¿dónde está?')).toBe('dónde está')
  })

  it('strips Spanish/Chinese inverted marks', () => {
    expect(normalizeAnswer('¡hola!')).toBe('hola')
  })

  it('collapses internal whitespace', () => {
    expect(normalizeAnswer('hello   world')).toBe('hello world')
  })
})

// ── checkAnswer ───────────────────────────────────────────────────────────────

describe('checkAnswer', () => {
  const item: DrillItem = {
    id: 't1', type: 'translation', instruction: 'x', promptLang: 'en-US',
    prompt: 'Good morning.',
    answer: 'Buenos días.',
    variants: ['Buenos dias'],
  }

  it('accepts the canonical answer', () => {
    expect(checkAnswer('Buenos días.', item)).toBe(true)
  })

  it('accepts a variant', () => {
    expect(checkAnswer('Buenos dias', item)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(checkAnswer('buenos días', item)).toBe(true)
    expect(checkAnswer('BUENOS DÍAS.', item)).toBe(true)
  })

  it('rejects a wrong answer', () => {
    expect(checkAnswer('Buenas noches', item)).toBe(false)
  })

  it('rejects an empty answer', () => {
    expect(checkAnswer('', item)).toBe(false)
  })
})
