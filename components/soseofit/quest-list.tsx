'use client'

import { ArrowRight, Lightbulb, PartyPopper } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Criterion, Suggestion } from '@/lib/types'
import { cn } from '@/lib/utils'

function SuggestedText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/)
  return (
    <>
      {parts.map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <span
            key={i}
            className="mx-0.5 inline-flex items-center rounded-md border border-dashed border-primary/50 bg-accent px-1.5 text-[13px] font-semibold text-accent-foreground"
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export function QuestList({
  suggestions,
  criteria,
  checks,
  onToggle,
  idPrefix,
}: {
  suggestions: Suggestion[]
  criteria: Criterion[]
  checks: number[]
  onToggle: (index: number) => void
  idPrefix: string
}) {
  const done = checks.length
  const total = suggestions.length

  return (
    <section aria-labelledby={`${idPrefix}-quest-heading`} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <h3 id={`${idPrefix}-quest-heading`} className="text-sm font-bold">
          수정 퀘스트
        </h3>
        {total > 0 && (
          <p className="font-mono text-xs text-muted-foreground" aria-live="polite">
            <span className="text-base font-bold text-foreground">
              {done}/{total}
            </span>{' '}
            완료
          </p>
        )}
      </div>

      {total === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
          <PartyPopper className="size-4 text-gold" aria-hidden />
          남은 수정 퀘스트가 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {suggestions.map((s, i) => {
            const checked = checks.includes(i)
            const tag = criteria.find((c) => c.id === s.criterion_id)?.name ?? '기타'
            const checkboxId = `${idPrefix}-quest-${i}`
            return (
              <li
                key={`${s.criterion_id}-${i}`}
                className={cn(
                  'flex gap-3 rounded-xl border bg-card p-3 transition-colors',
                  checked && 'border-good/40 bg-good-soft/60',
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={() => onToggle(i)}
                  className="mt-0.5"
                  aria-label={`${tag} 퀘스트 완료`}
                />
                <div className={cn('flex min-w-0 flex-1 flex-col gap-2', checked && 'opacity-70')}>
                  <label htmlFor={checkboxId} className="w-fit cursor-pointer">
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
                      {tag}
                    </span>
                  </label>
                  <div className="flex flex-col gap-1.5 text-sm leading-6">
                    <p className="text-muted-foreground line-through decoration-muted-foreground/50">
                      {s.original}
                    </p>
                    <p className="flex items-start gap-1.5">
                      <ArrowRight className="mt-1.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="sr-only">제안: </span>
                      <span className={cn('font-medium', checked && 'line-through')}>
                        <SuggestedText text={s.suggested} />
                      </span>
                    </p>
                  </div>
                  <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden />
                    {s.reason}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
