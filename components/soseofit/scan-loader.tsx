'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Circle, Lightbulb, Loader2, ScanSearch } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const STEPS = ['문항 의도 파악', '구조 분석', '구체성 확인', '직무 연결성 확인']
const TIPS = [
  "첫 문장에 결론을 두면 '두괄식 구조'가 바로 올라가요",
  "'많은', '좋은' 대신 숫자를 쓰면 '경험의 구체성'이 올라가요",
  '성과를 어떻게 확인했는지 쓰면 직무 연결성이 살아나요',
  '한 문단에는 한 가지 메시지만 담아 보세요',
]

export function ScanLoader({ done }: { done: boolean }) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [tip, setTip] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200)
    const tipTimer = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3000)
    return () => {
      clearInterval(stepTimer)
      clearInterval(tipTimer)
    }
  }, [])

  const activeIndex = done ? STEPS.length : step

  return (
    <section
      aria-live="polite"
      aria-busy={!done}
      className="flex flex-col items-center gap-6 rounded-2xl border bg-card px-5 py-10 text-center shadow-card"
    >
      <div className="relative grid size-20 place-items-center">
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-full border-2 border-dashed border-primary/40',
            !done && 'animate-spin [animation-duration:6s]',
          )}
        />
        <span className="grid size-14 place-items-center rounded-full bg-accent text-primary">
          {done ? <CheckCircle2 className="size-7 text-good" aria-hidden /> : <ScanSearch className="size-7" aria-hidden />}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold">{done ? '진단 완료!' : '자소서를 스캔하고 있어요'}</h3>
        <p className="mt-1 text-sm text-muted-foreground">보통 10초 안에 끝나요</p>
      </div>

      <ol className="flex w-full max-w-xs flex-col gap-2.5 text-left">
        {STEPS.map((label, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
          return (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              {state === 'done' ? (
                <CheckCircle2 className="size-4.5 text-good" aria-hidden />
              ) : state === 'active' ? (
                <Loader2 className="size-4.5 animate-spin text-primary" aria-hidden />
              ) : (
                <Circle className="size-4.5 text-muted-foreground/50" aria-hidden />
              )}
              <span
                className={cn(
                  state === 'pending' && 'text-muted-foreground',
                  state === 'active' && 'font-semibold',
                )}
              >
                {label}
              </span>
              <span className="sr-only">
                {state === 'done' ? '완료' : state === 'active' ? '진행 중' : '대기'}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex min-h-12 w-full max-w-sm items-start gap-2 rounded-xl bg-gold-soft px-3 py-2.5 text-left text-xs leading-5 text-gold-ink">
        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={tip}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <span className="font-bold">TIP</span> {TIPS[tip]}
          </motion.p>
        </AnimatePresence>
      </div>
    </section>
  )
}
