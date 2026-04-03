'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Language, DrillTopic, DrillItem } from '@/lib/drills'
import { LANGUAGES, TOPICS, getDB, shuffle } from '@/lib/drills'
import { loadLanguage, saveLanguage } from '@/lib/stats'

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGS: Language[] = ['es', 'fr', 'de', 'zh', 'ja', 'ko', 'en']

// BCP-47 codes for Web Speech API
const SPEECH_LANG: Record<Language, string> = {
  es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
  zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', en: 'en-US',
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5] as const
type SpeechRate = typeof SPEED_PRESETS[number]

function speak(text: string, lang: string, rate: SpeechRate = 1) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = lang
  utt.rate = rate
  window.speechSynthesis.speak(utt)
}

type CategoryFilter = 'all' | 'sentence' | 'vocab' | 'phrase'
const CAT_LABELS: Record<CategoryFilter, string> = {
  all: 'All', sentence: 'Sentence', vocab: 'Vocab', phrase: 'Phrase',
}

type Phase = 'select' | 'study'

// CJK-safe font stack — prevents Next.js's synthetic Inter fallback from
// swallowing characters it doesn't have glyphs for
const FONT_CJK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", "Noto Sans JP", "Hiragino Kaku Gothic Pro", "Malgun Gothic", sans-serif'

const RANDOM_PRESETS = [10, 25, 50]

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudyClient() {
  // Filters (shared across both phases)
  const [language,  setLanguage]  = useState<Language>('es')
  const [topic,     setTopic]     = useState<DrillTopic | null>(null)
  const [category,  setCategory]  = useState<CategoryFilter>('all')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [phase,       setPhase]       = useState<Phase>('select')

  // Study (flashcard) state — built on "Start"
  const [deck,       setDeck]      = useState<DrillItem[]>([])
  const [index,      setIndex]     = useState(0)
  const [flipped,    setFlipped]   = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [autoPlay,   setAutoPlay]  = useState(false)
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1)

  // Load saved language on mount
  useEffect(() => {
    loadLanguage().then(l => setLanguage(l))
  }, [])

  // All items for the current language
  const allItems = useMemo(() => getDB(language), [language])

  // Items visible under current filters (used in select phase list)
  const filteredItems = useMemo(() => {
    let items = allItems
    if (topic)              items = items.filter(d => d.topic    === topic)
    if (category !== 'all') items = items.filter(d => (d.category ?? 'sentence') === category)
    return items
  }, [allItems, topic, category])

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleItem = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectAll = () =>
    setSelectedIds(new Set(filteredItems.map(d => d.id)))

  const clearAll = () =>
    setSelectedIds(new Set())

  const pickRandom = (n: number) => {
    const pool = shuffle(filteredItems)
    setSelectedIds(new Set(pool.slice(0, n).map(d => d.id)))
  }

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every(d => selectedIds.has(d.id))

  // ── Start studying ─────────────────────────────────────────────────────────

  const startStudy = () => {
    // Build ordered deck from allItems preserving library order, optionally shuffled
    const ordered = allItems.filter(d => selectedIds.has(d.id))
    const finalDeck = isShuffled ? shuffle(ordered) : ordered
    setDeck(finalDeck)
    setIndex(0)
    setFlipped(false)
    setPhase('study')
  }

  // ── Flashcard navigation ───────────────────────────────────────────────────

  const navigate = useCallback((newIndex: number) => {
    setFlipped(false)
    setIndex(newIndex)
  }, [])

  const goNext = useCallback(() => navigate(Math.min(index + 1, deck.length - 1)), [navigate, index, deck.length])
  const goPrev = useCallback(() => navigate(Math.max(index - 1, 0)),              [navigate, index])

  useEffect(() => {
    if (phase !== 'study') return
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); setFlipped(f => !f)
      }
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft')  goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, goNext, goPrev])

  // Auto-play: speak the answer when the card flips to the back
  useEffect(() => {
    if (phase !== 'study' || !autoPlay || !flipped) return
    const card = deck[index]
    if (card) speak(card.answer, SPEECH_LANG[language], speechRate)
  }, [flipped, autoPlay, phase, deck, index, language, speechRate])

  const card = deck[index]

  // ── Shared filter bar fragment ─────────────────────────────────────────────

  const FilterBar = (
    <>
      {/* Language pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {LANGS.map(code => {
          const info   = LANGUAGES[code]
          const active = language === code
          return (
            <button
              key={code}
              onClick={() => {
                setLanguage(code)
                setSelectedIds(new Set())
                saveLanguage(code)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                border: active ? '1px solid transparent' : '1px solid var(--border-mid)',
                background: active ? 'var(--text-1)' : 'white',
                color: active ? 'var(--bg)' : 'var(--text-2)',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: active ? 600 : 400, fontSize: '0.8125rem', cursor: 'pointer',
              }}
            >
              <span>{info.flag}</span><span>{info.native}</span>
            </button>
          )
        })}
      </div>

      {/* Category + topic */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(Object.keys(CAT_LABELS) as CategoryFilter[]).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: '4px 10px', borderRadius: 3,
              border: '1px solid var(--border-mid)',
              background: category === c ? 'var(--surface-2)' : 'transparent',
              color: category === c ? 'var(--text-1)' : 'var(--text-3)',
              fontFamily: 'var(--font-jetbrains), monospace',
              fontSize: '0.5625rem', letterSpacing: '0.06em', textTransform: 'uppercase',
              fontWeight: category === c ? 600 : 400, cursor: 'pointer',
            }}
          >
            {CAT_LABELS[c]}
          </button>
        ))}

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />

        {([null, ...Object.keys(TOPICS)] as (DrillTopic | null)[]).map(t => {
          const info   = t ? TOPICS[t] : null
          const active = topic === t
          return (
            <button
              key={t ?? 'none'}
              onClick={() => setTopic(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20,
                border: '1px solid transparent',
                background: active ? 'var(--text-1)' : 'var(--surface-2)',
                color: active ? 'var(--bg)' : 'var(--text-2)',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontSize: '0.75rem', fontWeight: active ? 600 : 400, cursor: 'pointer',
              }}
            >
              {info && <span style={{ fontSize: '0.6875rem' }}>{info.icon}</span>}
              {info ? info.label : 'All topics'}
            </button>
          )
        })}
      </div>
    </>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SELECT PHASE
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)' }}>

        {/* Page header */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 32px 0' }}>
            <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
              Flashcard Review
            </div>
            <h1 style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.03em', color: 'var(--text-1)', lineHeight: 1.1, marginBottom: 24 }}>
              Study
            </h1>

            {FilterBar}

            <div style={{ height: 20 }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', padding: '24px 32px 120px' }}>

          {/* Quick-pick + bulk controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Random
            </span>
            {RANDOM_PRESETS.map(n => (
              <button
                key={n}
                onClick={() => pickRandom(n)}
                disabled={filteredItems.length === 0}
                style={{
                  padding: '5px 13px', borderRadius: 3, border: '1px solid var(--border-mid)',
                  background: 'white', color: 'var(--text-2)',
                  fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500,
                  fontSize: '0.8125rem', cursor: filteredItems.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: filteredItems.length === 0 ? 0.4 : 1,
                }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => pickRandom(filteredItems.length)}
              disabled={filteredItems.length === 0}
              style={{
                padding: '5px 13px', borderRadius: 3, border: '1px solid var(--border-mid)',
                background: 'white', color: 'var(--text-2)',
                fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500,
                fontSize: '0.8125rem', cursor: filteredItems.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredItems.length === 0 ? 0.4 : 1,
              }}
            >
              All ({filteredItems.length})
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={allFilteredSelected ? clearAll : selectAll}
                style={{
                  padding: '5px 13px', borderRadius: 3,
                  border: '1px solid var(--border-mid)',
                  background: 'transparent', color: 'var(--text-2)',
                  fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500,
                  fontSize: '0.8125rem', cursor: 'pointer',
                }}
              >
                {allFilteredSelected ? 'Deselect all' : 'Select all'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    padding: '5px 13px', borderRadius: 3,
                    border: '1px solid var(--border-mid)',
                    background: 'transparent', color: 'var(--incorrect)',
                    fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500,
                    fontSize: '0.8125rem', cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Item count */}
          <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.625rem', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 10 }}>
            {filteredItems.length} items · {selectedIds.size} selected
          </div>

          {/* List */}
          {filteredItems.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.75rem', color: 'var(--text-3)' }}>
              No items match the selected filters.
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 6,
                overflow: 'hidden',
                background: 'white',
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 130px 110px 1fr auto 1fr',
                  gap: 0,
                  padding: '8px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-1)',
                }}
              >
                {['', 'Type', 'Topic', 'Prompt', '', 'Answer'].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: 'var(--font-jetbrains), monospace',
                      fontSize: '0.5625rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                      alignSelf: 'center',
                      textAlign: i === 4 ? 'center' : 'left',
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {filteredItems.map((item, i) => {
                  const checked  = selectedIds.has(item.id)
                  const topicInfo = item.topic ? TOPICS[item.topic] : null
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 130px 110px 1fr auto 1fr',
                        gap: 0,
                        padding: '9px 16px',
                        borderBottom: i < filteredItems.length - 1 ? '1px solid var(--border)' : 'none',
                        background: checked ? 'rgba(0,0,0,0.02)' : 'white',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                        alignItems: 'start',
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        style={{
                          width: 16, height: 16, borderRadius: 3,
                          border: checked ? 'none' : '1.5px solid var(--border-strong)',
                          background: checked ? 'var(--text-1)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {checked && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Type badge */}
                      <span
                        style={{
                          fontFamily: 'var(--font-jetbrains), monospace',
                          fontSize: '0.5rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#4B5563',
                          border: '1px solid #D1D5DB',
                          padding: '2px 6px',
                          borderRadius: 2,
                          display: 'inline-block',
                          width: 'fit-content',
                        }}
                      >
                        {item.type}
                      </span>

                      {/* Topic */}
                      <span
                        style={{
                          fontFamily: 'var(--font-manrope), sans-serif',
                          fontSize: '0.75rem',
                          color: 'var(--text-3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {topicInfo && <span>{topicInfo.icon}</span>}
                        {topicInfo?.label ?? '—'}
                      </span>

                      {/* Prompt */}
                      <span
                        style={{
                          fontFamily: 'var(--font-jetbrains), monospace',
                          fontSize: '0.8125rem',
                          color: 'var(--text-1)',
                          paddingRight: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.prompt}
                      </span>

                      {/* Arrow */}
                      <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.625rem', color: 'var(--text-3)', paddingRight: 12, alignSelf: 'flex-start', paddingTop: 2 }}>
                        →
                      </span>

                      {/* Answer */}
                      <span
                        style={{
                          fontFamily: FONT_CJK,
                          fontSize: '0.8125rem',
                          color: 'var(--text-2)',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.answer}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky bottom bar ── */}
        {selectedIds.size > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'white',
              borderTop: '1px solid var(--border)',
              padding: '14px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 40,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-fraunces), sans-serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                {selectedIds.size}
              </span>
              <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                card{selectedIds.size !== 1 ? 's' : ''} selected
              </span>

              {/* Shuffle toggle in bar */}
              <button
                onClick={() => setIsShuffled(s => !s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 3,
                  border: '1px solid var(--border-mid)',
                  background: isShuffled ? 'var(--surface-2)' : 'transparent',
                  color: isShuffled ? 'var(--text-1)' : 'var(--text-3)',
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: isShuffled ? 600 : 400, fontSize: '0.8125rem', cursor: 'pointer',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M1 4h2.5l2.5 4-2.5 4H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 4h-2.5l-2.5 4 2.5 4H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 12h4l6-8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 4h4l2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isShuffled ? 'Shuffled' : 'Shuffle'}
              </button>
            </div>

            <button
              onClick={startStudy}
              style={{
                background: 'var(--text-1)', color: 'var(--bg)',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 600, fontSize: '0.9375rem',
                padding: '11px 28px', border: 'none',
                borderRadius: 4, cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              Study {selectedIds.size} cards →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STUDY PHASE (flashcards)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .study-scene  { perspective: 1200px; }
        .study-inner  {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .study-inner.flipped { transform: rotateY(180deg); }
        .study-face {
          position: absolute; inset: 0;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 40px; border-radius: 8px;
        }
        .study-back { transform: rotateY(180deg); }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)' }}>

        {/* Study header */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => setPhase('select')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontSize: '0.875rem', color: 'var(--text-2)',
                cursor: 'pointer', padding: '4px 0',
              }}
            >
              ← Back to selection
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Auto-play toggle */}
              <button
                onClick={() => setAutoPlay(a => !a)}
                title={autoPlay ? 'Auto-play on' : 'Auto-play off'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: autoPlay ? 'var(--surface-2)' : 'transparent',
                  border: '1px solid var(--border-mid)', borderRadius: 3,
                  padding: '4px 10px', cursor: 'pointer',
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontSize: '0.75rem', color: autoPlay ? 'var(--text-1)' : 'var(--text-3)',
                  fontWeight: autoPlay ? 600 : 400,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={autoPlay ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                Auto-play
              </button>

              {/* Speed selector */}
              <div style={{ display: 'flex', border: '1px solid var(--border-mid)', borderRadius: 3, overflow: 'hidden' }}>
                {SPEED_PRESETS.map(rate => (
                  <button
                    key={rate}
                    onClick={() => setSpeechRate(rate)}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRight: rate !== 1.5 ? '1px solid var(--border-mid)' : 'none',
                      background: speechRate === rate ? 'var(--text-1)' : 'transparent',
                      color: speechRate === rate ? 'var(--bg)' : 'var(--text-3)',
                      fontFamily: 'var(--font-jetbrains), monospace',
                      fontSize: '0.5625rem', letterSpacing: '0.04em',
                      cursor: 'pointer', fontWeight: speechRate === rate ? 700 : 400,
                    }}
                  >
                    {rate === 1 ? '1×' : `${rate}×`}
                  </button>
                ))}
              </div>

              <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
                {deck.length > 0 ? `${index + 1} / ${deck.length}` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 32px 32px', maxWidth: 800, width: '100%', margin: '0 auto' }}>

          {!card ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.75rem', color: 'var(--text-3)' }}>
              No cards in deck.
            </div>
          ) : (
            <>
              {/* Flashcard */}
              <div
                className="study-scene"
                style={{ width: '100%', height: 280, marginBottom: 28 }}
                onClick={() => setFlipped(f => !f)}
              >
                <div key={index} className={`study-inner${flipped ? ' flipped' : ''}`}>

                  {/* Front — prompt */}
                  <div
                    className="study-face"
                    style={{ background: 'white', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', gap: 16, textAlign: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4B5563', border: '1px solid #D1D5DB', padding: '2px 7px', borderRadius: 2 }}>
                        {card.type}
                      </span>
                      <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        {card.instruction}
                      </span>
                    </div>

                    <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 400, color: 'var(--text-1)', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                      {card.prompt}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); speak(card.prompt, 'en-US', speechRate) }}
                        title="Speak prompt"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: 'var(--surface-1)', border: '1px solid var(--border-mid)',
                          borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                          color: 'var(--text-2)',
                          fontFamily: 'var(--font-manrope), sans-serif',
                          fontSize: '0.8125rem', fontWeight: 500,
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                        Listen
                      </button>
                      <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase', opacity: 0.5 }}>
                        space to reveal
                      </span>
                    </div>
                  </div>

                  {/* Back — answer */}
                  <div
                    className="study-face study-back"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', gap: 16, textAlign: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                        Answer
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); speak(card.answer, SPEECH_LANG[language], speechRate) }}
                        title="Speak answer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.4)',
                          borderRadius: 20, padding: '4px 11px', cursor: 'pointer',
                          color: '#0d9488',
                          fontFamily: 'var(--font-manrope), sans-serif',
                          fontSize: '0.75rem', fontWeight: 500,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                        Listen
                      </button>
                    </div>

                    <div style={{ fontFamily: FONT_CJK, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 500, color: 'var(--text-1)', lineHeight: 1.45 }}>
                      {card.answer}
                    </div>

                    {card.variants && card.variants.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                        {card.variants.map((v, i) => (
                          <span key={i} style={{ fontFamily: FONT_CJK, fontSize: '0.8125rem', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 3 }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 4, opacity: 0.7 }}>
                      {card.prompt}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prev / Next */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'center' }}>
                <button
                  onClick={goPrev}
                  disabled={index === 0}
                  style={{
                    padding: '9px 22px', border: '1px solid var(--border-mid)', borderRadius: 3,
                    background: 'transparent',
                    color: index === 0 ? 'var(--text-3)' : 'var(--text-1)',
                    fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500, fontSize: '0.875rem',
                    cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1,
                  }}
                >
                  ← Prev
                </button>

                {/* Progress strip */}
                <div style={{ flex: 1, maxWidth: 300, display: 'flex', gap: 3, alignItems: 'center', overflow: 'hidden' }}>
                  {deck.slice(0, 60).map((_, i) => (
                    <div
                      key={i}
                      onClick={() => navigate(i)}
                      style={{
                        flex: 1, height: 4, borderRadius: 2, minWidth: 3, cursor: 'pointer',
                        background: i < index ? 'var(--text-3)' : i === index ? 'var(--text-1)' : 'var(--surface-3)',
                        transition: 'background 0.15s',
                      }}
                    />
                  ))}
                  {deck.length > 60 && (
                    <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5rem', color: 'var(--text-3)', flexShrink: 0, marginLeft: 4 }}>
                      +{deck.length - 60}
                    </span>
                  )}
                </div>

                <button
                  onClick={goNext}
                  disabled={index === deck.length - 1}
                  style={{
                    padding: '9px 22px', borderRadius: 3, border: 'none',
                    background: index === deck.length - 1 ? 'var(--surface-2)' : 'var(--text-1)',
                    color: index === deck.length - 1 ? 'var(--text-3)' : 'var(--bg)',
                    fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: '0.875rem',
                    cursor: index === deck.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next →
                </button>
              </div>

              <div style={{ marginTop: 20, fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.06em', color: 'var(--text-3)', textAlign: 'center', opacity: 0.7 }}>
                space / ↑↓ flip · ← → navigate
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
