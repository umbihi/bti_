'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles, Trophy, X } from 'lucide-react'
import { VerdictGauge } from '@/components/soseofit/verdict-gauge'
import { VERDICT_META, type CriterionChange } from '@/lib/helpers'

export function LevelUpCard({
  changes,
  allClear,
  onClose,
}: {
  changes: CriterionChange[]
  allClear: boolean
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const ups = changes.filter((c) => c.delta > 0)
  if (ups.length === 0 && !allClear) return null

  return (
    <motion.section
      role="status"
      initial={reduce ? false : { opacity: 0, scale: 0.96, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="relative overflow-hidden rounded-2xl border border-gold/50 bg-gradient-to-br from-gold-soft via-card to-accent p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="레벨업 알림 닫기"
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-card/70"
      >
        <X className="size-4" aria-hidden />
      </button>
      <p className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-widest text-gold-ink">
        {allClear ? <Trophy className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {allClear ? 'ALL CLEAR' : 'LEVEL UP'}
      </p>
      <p className="mt-1 text-lg font-black">
        {allClear ? '모든 항목을 충분으로 만들었어요!' : `${ups.length}개 항목이 올랐어요!`}
      </p>
      {ups.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {ups.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
              <VerdictGauge verdict={c.from} animate={false} size="sm" />
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
              <VerdictGauge verdict={c.to} delay={0.2 + i * 0.12} size="sm" />
              <span className="sr-only">
                {VERDICT_META[c.from].label}에서 {VERDICT_META[c.to].label}로
              </span>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  )
}
