'use client'

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/components/soseofit/app-store'
import { cn } from '@/lib/utils'

const REASONS = ['판정이 틀렸어요', '제안이 어색해요', '너무 일반적이에요']

export function FeedbackRow() {
  const { feedback, sendFeedback, diagnosisId } = useAppStore()
  const sent = feedback[diagnosisId]
  const [askReason, setAskReason] = useState(false)

  if (sent)
    return (
      <p className="text-center text-xs text-muted-foreground" role="status">
        의견을 보내 주셨어요. 고마워요!
      </p>
    )

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">이 진단이 도움이 됐나요?</p>
      {askReason ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => sendFeedback('down', r)}
              className="rounded-full border bg-card px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={() => sendFeedback('down')}
            className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            건너뛰기
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {[
            { v: 'up' as const, Icon: ThumbsUp, label: '도움이 됐어요' },
            { v: 'down' as const, Icon: ThumbsDown, label: '아쉬워요' },
          ].map(({ v, Icon, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => (v === 'up' ? sendFeedback('up') : setAskReason(true))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
