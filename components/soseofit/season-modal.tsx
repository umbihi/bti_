'use client'

import { CalendarCheck, Check, Flame, Lock, Medal, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/components/soseofit/app-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { currentWeek, streakCount } from '@/lib/helpers'
import { cn } from '@/lib/utils'

export function SeasonModal() {
  const { seasonOpen, setSeasonOpen, stamps, achievements, resetRecords } = useAppStore()
  const [confirmReset, setConfirmReset] = useState(false)

  const today = new Date()
  const streak = streakCount(stamps, today)
  const weekDays = currentWeek(today)
  const stampsSet = new Set(stamps)

  const handleReset = () => {
    resetRecords()
    setConfirmReset(false)
  }

  return (
    <Dialog open={seasonOpen} onOpenChange={setSeasonOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-gold/10 text-gold-ink">
              <Flame className="size-4 text-gold" aria-hidden />
            </div>
            <DialogTitle>시즌 진행 및 업적</DialogTitle>
          </div>
          <DialogDescription>
            매일 자소서를 다듬고 시즌 스탬프와 특별한 업적을 모아보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* 연속 진단 스트릭 배너 */}
          <div className="flex items-center justify-between rounded-2xl border border-gold/40 bg-gradient-to-r from-gold-soft/50 via-card to-card p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-gold text-white dark:text-black shadow-sm">
                <Flame className="size-6" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold text-gold-ink">연속 진단 스트릭</p>
                <p className="text-xl font-black">
                  {streak > 0 ? `${streak}일째 작성 중!` : '오늘의 첫 진단 도전!'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-black text-foreground">{stamps.length}</span>
              <span className="text-xs text-muted-foreground ml-1">스탬프</span>
            </div>
          </div>

          {/* 이번 주 스탬프 캘린더 */}
          <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground/80">
                <CalendarCheck className="size-3.5 text-primary" aria-hidden />
                이번 주 출석 현황
              </span>
              <span className="text-muted-foreground font-mono">
                {today.getFullYear()}.{today.getMonth() + 1}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 pt-1 text-center">
              {weekDays.map((day) => {
                const stamped = stampsSet.has(day.key)
                return (
                  <div
                    key={day.key}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl p-2 transition-colors',
                      day.isToday ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-card',
                      stamped && 'bg-good-soft/70 border border-good/30'
                    )}
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {day.label}
                    </span>
                    <div
                      className={cn(
                        'grid size-7 place-items-center rounded-full text-xs font-bold transition-all',
                        stamped
                          ? 'bg-good text-good-foreground'
                          : day.isToday
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {stamped ? <Check className="size-3.5 stroke-[3]" /> : day.date}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 업적 목록 */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                <Medal className="size-3.5 text-gold" aria-hidden />
                업적 컬렉션
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {achievements.length} / {ACHIEVEMENTS.length} 달성
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {ACHIEVEMENTS.map((item) => {
                const unlocked = achievements.includes(item.id)
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-3 transition-colors',
                      unlocked
                        ? 'border-gold/40 bg-gold-soft/30'
                        : 'border-border/60 bg-muted/20 opacity-70'
                    )}
                  >
                    <div
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg mt-0.5',
                        unlocked ? 'bg-gold text-white dark:text-black' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {unlocked ? <Icon className="size-4" /> : <Lock className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={cn('text-xs font-bold truncate', unlocked ? 'text-foreground' : 'text-muted-foreground')}>
                          {item.title}
                        </p>
                        {unlocked && (
                          <span className="grid size-3.5 place-items-center rounded-full bg-gold text-white dark:text-black text-[9px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 하단 기록 초기화 */}
          <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>로컬에 저장된 스트릭과 업적 데이터</span>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-bad-ink font-semibold">정말 초기화할까요?</span>
                <Button size="sm" variant="destructive" onClick={handleReset} className="h-7 text-xs rounded-lg">
                  초기화
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)} className="h-7 text-xs rounded-lg">
                  취소
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1 hover:text-bad-ink transition-colors"
              >
                <RotateCcw className="size-3" aria-hidden />
                기록 초기화
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

