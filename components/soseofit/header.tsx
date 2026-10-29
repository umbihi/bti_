'use client'

import { Flame, KeyRound, Medal, Moon, PenLine, ShieldCheck, Sun, WifiOff } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAppStore } from '@/components/soseofit/app-store'
import { useOnline } from '@/hooks/use-browser'
import { streakCount } from '@/lib/helpers'
import { cn } from '@/lib/utils'

const STEPS = ['자소서 붙여넣기', '가명 처리 확인', '진단 · 수정 퀘스트']

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-bad px-4 py-2 text-sm font-medium text-white"
    >
      <WifiOff className="size-4" aria-hidden />
      인터넷 연결을 확인해 주세요
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="라이트/다크 모드 전환"
      className="grid size-9 place-items-center rounded-xl border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      <Sun className="size-4 dark:hidden" aria-hidden />
      <Moon className="hidden size-4 dark:block" aria-hidden />
    </button>
  )
}

export function Header() {
  const { apiKey, openKeyModal, stamps, achievements, setSeasonOpen, shieldApplied, hydrated } =
    useAppStore()
  const streak = streakCount(stamps)
  const today = new Date()
  const seasonLabel = hydrated ? `${today.getMonth() + 1}월 시즌 ${today.getDate()}일` : '시즌'

  return (
    <header className="border-b bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.45_0.2_290)] text-primary-foreground shadow-card"
            >
              <PenLine className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 text-lg leading-none font-black tracking-tight">
                소서핏
                <span className="rounded-md bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-foreground">
                  β
                </span>
              </h1>
              <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
                붙여넣고 10초, 부족한 곳만 짚어드려요
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSeasonOpen(true)}
              aria-label={`${seasonLabel}, 연속 ${streak}일 진단. 시즌 기록 열기`}
              className="flex h-9 items-center gap-1.5 rounded-xl border bg-card px-2.5 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <Flame className={cn('size-4', streak > 0 ? 'text-gold' : 'text-muted-foreground')} aria-hidden />
              <span className="hidden md:inline">{seasonLabel}</span>
              <span className="font-mono">{streak}</span>
            </button>
            <button
              type="button"
              onClick={() => setSeasonOpen(true)}
              aria-label={`달성한 업적 ${achievements.length}개. 업적 목록 열기`}
              className="flex h-9 items-center gap-1 rounded-xl border bg-card px-2.5 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <Medal className="size-4 text-gold" aria-hidden />
              <span className="font-mono">{achievements.length}</span>
            </button>
            <button
              type="button"
              onClick={() => openKeyModal()}
              aria-label={apiKey ? 'AI 키 연결됨. 키 설정 열기' : 'AI 키 없음. 키 연결하기'}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors',
                apiKey
                  ? 'border-good/40 bg-good-soft text-good-ink'
                  : 'border-dashed border-na bg-na-soft text-na-ink hover:text-foreground',
              )}
            >
              {apiKey ? (
                <span className="size-2 rounded-full bg-good" aria-hidden />
              ) : (
                <KeyRound className="size-3.5" aria-hidden />
              )}
              <span className="hidden min-[400px]:inline">{apiKey ? '연결됨' : '키 없음'}</span>
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ol className="hidden items-center gap-1 text-xs text-muted-foreground md:flex" aria-label="사용법">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-1">
                <span className="grid size-5 place-items-center rounded-full bg-accent font-mono text-[10px] font-bold text-accent-foreground">
                  {i + 1}
                </span>
                <span className="font-medium text-foreground/80">{step}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-border" aria-hidden />}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground sm:hidden">붙여넣고 10초, 부족한 곳만 짚어드려요</p>
          {shieldApplied && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              실드 적용됨
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
