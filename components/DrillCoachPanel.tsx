'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { DrillItem, DrillResult, Language } from '@/lib/drills'
import { LANGUAGES } from '@/lib/drills'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  language:       Language
  currentItem:    DrillItem
  expectedAnswer: string       // sent to server only — never echoed in the chat UI
  submittedVal:   string
  feedback:       'correct' | 'incorrect' | 'timeout'
  results:        DrillResult[]
  items:          DrillItem[]
  itemIndex:      number
  model?:         string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DrillCoachPanel({
  language,
  currentItem,
  expectedAnswer,
  submittedVal,
  feedback,
  results,
  items,
  itemIndex,
  model = 'llama3.1',
}: Props) {
  const [messages,  setMessages]  = useState<CoachMessage[]>([])
  const [inputVal,  setInputVal]  = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState('')
  const [hintLevel, setHintLevel] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: CoachMessage = { role: 'user', content: trimmed }
    const nextMsgs = [...messages, userMsg]
    setMessages(nextMsgs)
    setInputVal('')
    setIsLoading(true)
    setError('')

    const recentItems = results.slice(-5).map(r => ({
      prompt:     r.item.prompt,
      userAnswer: r.userAnswer,
      correct:    r.correct,
      timedOut:   r.timedOut,
    }))

    try {
      const res = await fetch('/api/tutor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          sessionContext: {
            language:   LANGUAGES[language]?.name ?? language,
            drillType:  items[0]?.type ?? 'translation',
            itemIndex,
            itemsTotal: items.length,
          },
          currentItem: {
            instruction:    currentItem.instruction,
            prompt:         currentItem.prompt,
            type:           currentItem.type,
            expectedAnswer,   // server-side only — not stored in CoachMessage[]
            userAnswer:     submittedVal,
            feedback,
          },
          recentItems,
          messages: nextMsgs,
          constraints: {
            maxCoachTurns:    10,
            maxHintLevel:     3,
            currentHintLevel: hintLevel,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Coach error')
        setMessages(messages)   // roll back optimistic user message
        return
      }

      // Temporary: verify CJK characters survive the transport pipeline
      console.debug('[coach] assistant_message:', data.assistantMessage)
      setMessages([...nextMsgs, { role: 'assistant', content: data.assistantMessage }])

      if (data.structured?.hintLevel != null) {
        setHintLevel(data.structured.hintLevel)
      }
    } catch {
      setError('Network error — is the Python agent running?')
      setMessages(messages)
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [
    messages, isLoading, currentItem, expectedAnswer, submittedVal,
    feedback, results, items, itemIndex, language, model, hintLevel,
  ])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(inputVal)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div
      style={{
        marginTop: 20,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '9px 16px',
          borderBottom: hasMessages || isLoading || error ? '1px solid var(--border)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-jetbrains), monospace',
            fontSize: '0.625rem',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--text-2)',
            fontWeight: 500,
          }}
        >
          Drill Coach
        </span>
        <span
          style={{
            fontFamily: 'var(--font-jetbrains), monospace',
            fontSize: '0.5625rem',
            color: 'var(--text-3)',
            marginLeft: 'auto',
          }}
        >
          hints · explanations · guidance
        </span>
      </div>

      {/* ── Message list ── */}
      {hasMessages && (
        <div
          style={{
            maxHeight: 260,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '84%',
                  padding: '7px 12px',
                  borderRadius: msg.role === 'user'
                    ? '12px 12px 3px 12px'
                    : '12px 12px 12px 3px',
                  background: msg.role === 'user' ? 'var(--text-1)' : 'white',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  color: msg.role === 'user' ? 'var(--bg)' : 'var(--text-1)',
                  // Use -apple-system first so macOS automatically cascades to its
                  // built-in CJK fonts (PingFang SC / Hiragino) for every non-Latin
                  // character. Falling back to var(--font-manrope) alone blocks CJK
                  // because Next.js injects a synthetic fallback @font-face with no
                  // unicode-range limit that prevents explicit CJK names from firing.
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", "Noto Sans JP", "Hiragino Kaku Gothic Pro", "Malgun Gothic", "Apple Color Emoji", sans-serif',
                  fontSize: '0.8125rem',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px 12px 12px 3px',
                  background: 'white',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <svg
                  className="animate-spin"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: 'var(--text-3)', flexShrink: 0 }}
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: 'var(--font-manrope), sans-serif',
                    fontSize: '0.75rem',
                    color: 'var(--text-3)',
                  }}
                >
                  Thinking…
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Loading indicator when no messages yet */}
      {isLoading && !hasMessages && (
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <svg
            className="animate-spin"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: 'var(--text-3)' }}
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontSize: '0.75rem',
              color: 'var(--text-3)',
            }}
          >
            Thinking…
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div
          style={{
            margin: '0 14px 10px',
            padding: '7px 11px',
            background: 'var(--incorrect-dim)',
            border: '1px solid var(--incorrect)',
            borderRadius: 4,
            fontFamily: 'var(--font-jetbrains), monospace',
            fontSize: '0.6875rem',
            color: 'var(--incorrect)',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Input row ── */}
      <div
        style={{
          padding: '9px 10px',
          display: 'flex',
          gap: 7,
          alignItems: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={
            hasMessages
              ? 'Follow-up question…'
              : 'Ask for a hint, explanation, or guidance…'
          }
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: 'white',
            border: '1px solid var(--border-mid)',
            borderRadius: 4,
            padding: '7px 10px',
            fontFamily: 'var(--font-manrope), sans-serif',
            fontSize: '0.8125rem',
            color: isLoading ? 'var(--text-3)' : 'var(--text-1)',
            outline: 'none',
            transition: 'border-color 0.1s',
          }}
        />
        <button
          onClick={() => void sendMessage(inputVal)}
          disabled={isLoading || !inputVal.trim()}
          style={{
            background: isLoading || !inputVal.trim() ? 'var(--surface-2)' : 'var(--text-1)',
            color:      isLoading || !inputVal.trim() ? 'var(--text-3)' : 'var(--bg)',
            border: 'none',
            borderRadius: 4,
            padding: '7px 14px',
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: isLoading || !inputVal.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'background 0.1s',
          }}
        >
          {isLoading ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  )
}
