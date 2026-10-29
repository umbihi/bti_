'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { VERDICT_META } from '@/lib/helpers'
import type { Verdict } from '@/lib/types'
import { cn } from '@/lib/utils'

export function VerdictGauge({
  verdict,
  delay = 0,
  animate = true,
  size = 'md',
}: {
  verdict: Verdict
  delay?: number
  animate?: boolean
  size?: 'sm' | 'md'
}) {
  const reduce = useReducedMotion()
  const meta = VERDICT_META[verdict]
  const isNA = verdict === 'not_applicable'
  const block = size === 'sm' ? 'h-2.5 w-3.5' : 'h-3 w-5'

  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => {
        const filled = i < meta.level
        if (isNA)
          return <span key={i} className={cn(block, 'rounded-[3px] border border-dashed border-na')} />
        return (
          <span key={i} className={cn(block, 'relative overflow-hidden rounded-[3px] bg-muted')}>
            {filled && (
              <motion.span
                className={cn('absolute inset-0 origin-left', meta.fill)}
                initial={animate && !reduce ? { scaleX: 0 } : false}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.22, delay: delay + i * 0.09, ease: 'easeOut' }}
              />
            )}
          </span>
        )
      })}
    </span>
  )
}

export function VerdictLabel({ verdict, className }: { verdict: Verdict; className?: string }) {
  const meta = VERDICT_META[verdict]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-bold',
        meta.soft,
        meta.ink,
        meta.border,
        verdict === 'not_applicable' && 'border-dashed',
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
