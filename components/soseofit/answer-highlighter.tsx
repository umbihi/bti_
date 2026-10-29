'use client'

import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { CIRCLED, VERDICT_META } from '@/lib/helpers'
import type { Criterion } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Segment {
  start: number
  end: number
  text: string
  criteria: Criterion[]
}

function buildSegments(answer: string, criteria: Criterion[]): Segment[] {
  const byText = new Map<string, Criterion[]>()
  for (const c of criteria) {
    if (c.verdict === 'sufficient' || c.verdict === 'not_applicable') continue
    for (const ev of c.evidence) {
      if (!ev) continue
      byText.set(ev, [...(byText.get(ev) ?? []), c])
    }
  }
  const found: Segment[] = []
  for (const [text, list] of byText) {
    const start = answer.indexOf(text)
    if (start >= 0) found.push({ start, end: start + text.length, text, criteria: list })
  }
  found.sort((a, b) => a.start - b.start)
  const result: Segment[] = []
  let cursor = 0
  for (const seg of found) {
    if (seg.start < cursor) continue
    result.push(seg)
    cursor = seg.end
  }
  return result
}

export function AnswerHighlighter({
  answer,
  criteria,
  focus,
}: {
  answer: string
  criteria: Criterion[]
  focus: { text: string; nonce: number } | null
}) {
  const reduce = useReducedMotion()
  const segments = useMemo(() => buildSegments(answer, criteria), [answer, criteria])
  const markRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    if (!focus) return
    markRefs.current
      .get(focus.text)
      ?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [focus, reduce])

  const nodes: React.ReactNode[] = []
  let cursor = 0
  segments.forEach((seg) => {
    if (seg.start > cursor) nodes.push(answer.slice(cursor, seg.start))
    const worst = seg.criteria.reduce((a, b) =>
      VERDICT_META[a.verdict].level <= VERDICT_META[b.verdict].level ? a : b,
    )
    const isFocused = focus?.text === seg.text
    nodes.push(
      <mark
        key={`${seg.start}-${isFocused ? focus?.nonce : 0}`}
        ref={(el) => {
          if (el) markRefs.current.set(seg.text, el)
          else markRefs.current.delete(seg.text)
        }}
        className={cn(
          'rounded-sm px-0.5 text-foreground underline decoration-2 underline-offset-4',
          worst.verdict === 'insufficient' ? 'bg-bad-soft decoration-bad' : 'bg-warn-soft decoration-warn',
          isFocused && 'animate-evidence-flash',
        )}
      >
        {seg.text}
        <span className="ml-0.5 align-super font-mono text-[10px] font-bold text-primary">
          {seg.criteria.map((c) => CIRCLED[c.id] ?? c.id).join('')}
        </span>
        <span className="sr-only">
          {` (근거: ${seg.criteria.map((c) => `${c.name} ${VERDICT_META[c.verdict].label}`).join(', ')})`}
        </span>
      </mark>,
    )
    cursor = seg.end
  })
  if (cursor < answer.length) nodes.push(answer.slice(cursor))

  return (
    <div className="min-h-64 rounded-xl border bg-muted/30 px-3.5 py-3 text-[15px] leading-7 whitespace-pre-wrap break-words">
      {nodes}
    </div>
  )
}
