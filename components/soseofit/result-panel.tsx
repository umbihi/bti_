'use client'

import { AlertTriangle, ArrowRight, ClipboardCheck, Compass, RotateCcw, ScanSearch } from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '@/components/soseofit/app-store'
import { FeedbackRow } from '@/components/soseofit/feedback-row'
import { LevelUpCard } from '@/components/soseofit/level-up-card'
import { NoticeBox } from '@/components/soseofit/notice-box'
import { QuestList } from '@/components/soseofit/quest-list'
import { ScanLoader } from '@/components/soseofit/scan-loader'
import { StatCards } from '@/components/soseofit/stat-cards'
import { Button } from '@/components/ui/button'
import { compareResults, isAllClear } from '@/lib/helpers'

function EmptyState() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/60 px-5 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
        <ScanSearch className="size-7" aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-bold">아직 진단 결과가 없어요</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          자소서를 붙여넣고 진단하면 항목별 능력치와 수정 퀘스트가 여기에 나타나요.
        </p>
      </div>
      <ul className="grid w-full max-w-sm gap-2 text-left text-xs text-muted-foreground">
        {['문항이 묻는 의도', '항목별 충분 · 보완 · 부족 판정', '바로 고칠 수 있는 문장 제안'].map((t) => (
          <li key={t} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ResultPanel() {
  const {
    phase,
    scanDone,
    result,
    prevResult,
    isStale,
    notice,
    levelUpOpen,
    setLevelUpOpen,
    questChecks,
    toggleQuest,
    setFocusEvidence,
    requestDiagnose,
    startNextQuestion,
    diagnosisId,
  } = useAppStore()

  const changes = useMemo(
    () => (prevResult && result ? compareResults(prevResult, result) : undefined),
    [prevResult, result],
  )
  const allClear = result ? isAllClear(result) : false

  if (phase === 'scanning')
    return (
      <div className="flex flex-col gap-4">
        <ScanLoader done={scanDone} />
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      {notice && <NoticeBox notice={notice} />}

      {!result ? (
        !notice && <EmptyState />
      ) : (
        <>
          {isStale && (
            <div
              role="status"
              className="flex flex-col gap-2 rounded-xl border border-warn/40 bg-warn-soft px-3 py-2.5 text-sm sm:flex-row sm:items-center"
            >
              <p className="flex flex-1 items-center gap-2 font-medium text-warn-ink">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                답변이 바뀌었어요. 이 결과는 수정 전 기준이에요.
              </p>
              <Button size="sm" onClick={() => requestDiagnose()} className="rounded-lg">
                <RotateCcw data-icon="inline-start" aria-hidden />
                다시 진단
              </Button>
            </div>
          )}

          {levelUpOpen && changes && (
            <LevelUpCard changes={changes} allClear={allClear} onClose={() => setLevelUpOpen(false)} />
          )}

          <section
            aria-labelledby="intent-heading"
            className="rounded-2xl border bg-card p-4 shadow-card"
          >
            <h3 id="intent-heading" className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Compass className="size-4" aria-hidden />
              문항 의도
            </h3>
            <p className="mt-1.5 text-[15px] leading-7 font-medium text-pretty">{result.question_intent}</p>
          </section>

          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <StatCards
              criteria={result.criteria}
              changes={changes}
              onEvidence={setFocusEvidence}
              animateKey={diagnosisId}
            />
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <QuestList
              suggestions={result.suggestions}
              criteria={result.criteria}
              checks={questChecks}
              onToggle={toggleQuest}
              idPrefix={`d${diagnosisId}`}
            />
          </div>

          <FeedbackRow />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => requestDiagnose()}
              className="h-11 flex-1 rounded-xl"
            >
              <RotateCcw data-icon="inline-start" aria-hidden />
              고친 답변 다시 진단
            </Button>
            <Button
              variant={allClear ? 'default' : 'secondary'}
              onClick={() => startNextQuestion()}
              className="h-11 flex-1 rounded-xl"
            >
              {allClear ? (
                <ClipboardCheck data-icon="inline-start" aria-hidden />
              ) : (
                <ArrowRight data-icon="inline-start" aria-hidden />
              )}
              복사하고 다음 문항
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
