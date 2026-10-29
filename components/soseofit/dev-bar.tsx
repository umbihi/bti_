'use client'

import { Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAppStore, type DevPreset } from '@/components/soseofit/app-store'
import { cn } from '@/lib/utils'

const PRESETS: { id: DevPreset; label: string }[] = [
  { id: 'empty', label: '빈 입력' },
  { id: 'typing', label: '작성 중' },
  { id: 'no-key', label: '키 없음' },
  { id: 'mask', label: '가명 실드' },
  { id: 'scanning', label: '스캔 중' },
  { id: 'result', label: '진단 결과' },
  { id: 'levelup', label: '레벨업' },
  { id: 'allclear', label: '올클리어' },
  { id: 'cooldown-minute', label: '1분 쿨다운' },
  { id: 'cooldown-day', label: '일일 제한' },
  { id: 'season', label: '시즌/업적' },
]

export function DevBar() {
  const { applyPreset } = useAppStore()
  const [collapsed, setCollapsed] = useState(true)

  return (
    <aside
      aria-label="개발 및 데모 프리셋"
      className="fixed bottom-3 right-3 z-40 flex flex-col items-end"
    >
      <div
        className={cn(
          'flex flex-col gap-2 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur transition-all duration-200',
          collapsed && 'hidden'
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b pb-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Bug className="size-3.5 text-primary" aria-hidden />
            데모 및 상태 프리셋
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            닫기
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 max-w-xs">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                applyPreset(p.id)
              }}
              className="rounded-lg border bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="mt-2 flex h-8 items-center gap-1.5 rounded-full border bg-card/90 px-3 text-xs font-semibold text-muted-foreground shadow-md backdrop-blur hover:text-foreground"
        title="데모 상태 전환 툴바"
      >
        <Bug className="size-3.5 text-primary" aria-hidden />
        <span>프리셋</span>
        {collapsed ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
    </aside>
  )
}

