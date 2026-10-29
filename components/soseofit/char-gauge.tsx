'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function CharGauge({ count, limit }: { count: number; limit: number }) {
  const safeLimit = Math.max(1, limit)
  const ratio = count / safeLimit
  const over = ratio > 1
  const tooShort = count > 0 && ratio < 0.8
  const good = ratio >= 0.8 && !over

  const [shimmerKey, setShimmerKey] = useState(0)
  const prevRatio = useRef(ratio)
  useEffect(() => {
    if (prevRatio.current < 0.8 && ratio >= 0.8 && ratio <= 1) setShimmerKey((k) => k + 1)
    prevRatio.current = ratio
  }, [ratio])

  const status = over
    ? { text: `${(count - safeLimit).toLocaleString()}자 초과`, tone: 'text-bad-ink' }
    : tooShort
      ? { text: '분량 부족', tone: 'text-warn-ink' }
      : good
        ? { text: '적정 분량', tone: 'text-good-ink' }
        : { text: '', tone: '' }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-muted-foreground">
          <span className={cn('font-semibold text-foreground', over && 'text-bad-ink')}>
            {count.toLocaleString()}자
          </span>{' '}
          / {safeLimit.toLocaleString()}자
        </span>
        <span className={cn('font-semibold', status.tone)} aria-live="polite">
          {status.text}
        </span>
      </div>
      <div
        role="meter"
        aria-label="글자수"
        aria-valuemin={0}
        aria-valuemax={safeLimit}
        aria-valuenow={count}
        aria-valuetext={`${count}자 / ${safeLimit}자${status.text ? `, ${status.text}` : ''}`}
        className="relative h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width,background-color] duration-300',
            over ? 'bg-bad' : good ? 'bg-good' : 'bg-primary/70',
          )}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/25"
          style={{ left: '80%' }}
        />
        {shimmerKey > 0 && (
          <span
            key={shimmerKey}
            aria-hidden
            className="animate-gauge-shimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
        )}
      </div>
    </div>
  )
}
