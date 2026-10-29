'use client'

import { BatteryLow, Clock, Copy, FileQuestion, RotateCcw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore, type Notice } from '@/components/soseofit/app-store'
import { Button } from '@/components/ui/button'

function MinuteCooldown({ until, onRetry }: { until: number; onRetry: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])
  const remaining = Math.max(0, Math.ceil((until - now) / 1000))
  const progress = remaining / 60
  const r = 26
  const circumference = 2 * Math.PI * r

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-warn/40 bg-warn-soft px-5 py-6 text-center sm:flex-row sm:text-left">
      <div className="relative grid size-16 shrink-0 place-items-center" aria-hidden>
        <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-warn/25" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-warn transition-[stroke-dashoffset] duration-300"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <span className="font-mono text-lg font-bold text-warn-ink">{remaining}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="flex items-center justify-center gap-1.5 font-bold sm:justify-start">
          <Clock className="size-4 text-warn-ink" aria-hidden />
          잠시 쉬어가요
        </p>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {remaining > 0 ? `${remaining}초 뒤 다시 시도할 수 있어요` : '이제 다시 시도할 수 있어요'}
        </p>
      </div>
      <Button onClick={onRetry} disabled={remaining > 0} className="rounded-xl">
        <RotateCcw data-icon="inline-start" aria-hidden />
        다시 시도
      </Button>
    </div>
  )
}

export function NoticeBox({ notice }: { notice: Notice }) {
  const { requestDiagnose, copyAnswer, clearNotice } = useAppStore()
  const retry = () => {
    clearNotice()
    requestDiagnose()
  }

  if (notice.kind === 'cooldown_minute') return <MinuteCooldown until={notice.until} onRetry={retry} />

  if (notice.kind === 'cooldown_day')
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-5 py-6 text-center shadow-card sm:flex-row sm:text-left">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-bad-soft text-bad-ink">
          <BatteryLow className="size-7" aria-hidden />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-bold">오늘 무료 사용량을 다 썼어요</p>
          <p className="text-sm text-muted-foreground">
            오늘 오후 5시(한국 시간)에 다시 충전돼요. 지금 쓴 답변은 복사해 두세요.
          </p>
        </div>
        <Button variant="outline" onClick={() => copyAnswer()} className="rounded-xl">
          <Copy data-icon="inline-start" aria-hidden />
          답변 복사
        </Button>
      </div>
    )

  const config = {
    timeout: {
      icon: Clock,
      title: '응답이 늦어지고 있어요',
      desc: '구글 AI 서버가 바쁜 것 같아요. 잠시 후 다시 시도해 주세요.',
      retry: true,
    },
    not_cover_letter: {
      icon: FileQuestion,
      title: '자소서 답변이 아닌 것 같아요',
      desc: '문항에 대한 답변을 한국어로 50자 이상 붙여넣었는지 확인해 주세요.',
      retry: false,
    },
    network: {
      icon: WifiOff,
      title: '연결이 끊겼어요',
      desc: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
      retry: true,
    },
  }[notice.kind]
  const Icon = config.icon

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border bg-card px-5 py-5 shadow-card sm:flex-row sm:items-center">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="font-bold">{config.title}</p>
        <p className="text-sm text-muted-foreground">{config.desc}</p>
      </div>
      {config.retry ? (
        <Button onClick={retry} className="rounded-xl">
          <RotateCcw data-icon="inline-start" aria-hidden />
          다시 시도
        </Button>
      ) : (
        <Button variant="outline" onClick={clearNotice} className="rounded-xl">
          확인
        </Button>
      )}
    </div>
  )
}
