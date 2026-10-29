'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Quote, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { VerdictGauge, VerdictLabel } from '@/components/soseofit/verdict-gauge'
import { clearStats, type CriterionChange } from '@/lib/helpers'
import type { Criterion } from '@/lib/types'
import { cn } from '@/lib/utils'

export function StatCards({
  criteria,
  changes,
  onEvidence,
  animateKey,
}: {
  criteria: Criterion[]
  changes?: CriterionChange[]
  onEvidence?: (text: string) => void
  animateKey: string | number
}) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState<number | null>(null)
  const { cleared, total } = clearStats(criteria)

  const toggle = (c: Criterion) => {
    const next = open === c.id ? null : c.id
    setOpen(next)
    if (next !== null && c.evidence[0]) onEvidence?.(c.evidence[0])
  }

  return (
    <section aria-labelledby="stat-heading" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <h3 id="stat-heading" className="text-sm font-bold">
          능력치
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          클리어{' '}
          <span className="text-base font-bold text-foreground">
            {cleared}/{total}
          </span>
        </p>
      </div>
      <ul className="flex flex-col gap-2" key={animateKey}>
        {criteria.map((c, index) => {
          const change = changes?.find((ch) => ch.id === c.id)
          const isOpen = open === c.id
          const isNA = c.verdict === 'not_applicable'
          const panelId = `criterion-${c.id}-panel`
          return (
            <motion.li
              key={c.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.07 }}
              className={cn(
                'rounded-xl border bg-card transition-colors',
                isNA && 'border-dashed bg-na-soft/50',
                isOpen && 'border-primary/40',
              )}
            >
              <button
                type="button"
                onClick={() => toggle(c)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold',
                    isNA ? 'border border-dashed border-na text-na-ink' : 'bg-accent text-accent-foreground',
                  )}
                  aria-hidden
                >
                  {c.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm font-semibold', isNA && 'text-na-ink')}>
                    {c.name}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <VerdictGauge verdict={c.verdict} delay={index * 0.07 + 0.1} size="sm" />
                    {change && change.delta > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-good-ink">
                        <TrendingUp className="size-3" aria-hidden />
                        레벨업
                      </span>
                    )}
                    {change && change.delta < 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-bad-ink">
                        <TrendingDown className="size-3" aria-hidden />
                        하락
                      </span>
                    )}
                  </span>
                </span>
                <VerdictLabel verdict={c.verdict} />
                <ChevronDown
                  className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <div id={panelId} className="flex flex-col gap-2 border-t px-3 py-3 text-sm">
                  {change && change.delta < 0 && (
                    <p className="text-xs font-semibold text-bad-ink">
                      직전 진단보다 판정이 내려갔어요. 아래 근거를 확인해 보세요.
                    </p>
                  )}
                  <p className="leading-6 text-pretty">{c.feedback}</p>
                  {c.evidence.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {c.evidence.map((ev) => (
                        <li key={ev}>
                          <button
                            type="button"
                            onClick={() => onEvidence?.(ev)}
                            className="flex w-full items-start gap-2 rounded-lg bg-muted/60 px-2.5 py-2 text-left text-xs leading-5 text-muted-foreground hover:bg-muted"
                          >
                            <Quote className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                            <span>
                              <span className="text-foreground">{ev}</span>
                              <span className="ml-1.5 hidden font-medium text-primary lg:inline">원문에서 보기</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
