'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Medal } from 'lucide-react'
import { toast } from 'sonner'
import { achievementTitle, ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'

function AchievementToast({ id }: { id: AchievementId }) {
  const reduce = useReducedMotion()
  const meta = ACHIEVEMENTS.find((a) => a.id === id)
  return (
    <div
      role="status"
      className="flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-gold/50 bg-card p-3 pr-4 shadow-card"
    >
      <motion.div
        initial={reduce ? false : { scale: 0.3, y: 10, rotate: -20 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 14 }}
        className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gold text-gold-soft shadow-[0_0_0_4px_var(--gold-soft)]"
      >
        <Medal className="size-5 text-white dark:text-black" aria-hidden />
      </motion.div>
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-semibold tracking-widest text-gold-ink">ACHIEVEMENT</p>
        <p className="text-sm font-bold">업적 달성: {achievementTitle(id)}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta.desc}</p>}
      </div>
    </div>
  )
}

export function showAchievementToast(id: AchievementId) {
  toast.custom(() => <AchievementToast id={id} />, { duration: 3500 })
}
