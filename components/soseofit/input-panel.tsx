'use client'

import { FileText, KeyRound, Loader2, PencilLine, ScanSearch, Sparkles } from 'lucide-react'
import { useId, useState } from 'react'
import { AnswerHighlighter } from '@/components/soseofit/answer-highlighter'
import { useAppStore } from '@/components/soseofit/app-store'
import { CharGauge } from '@/components/soseofit/char-gauge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { countChars } from '@/lib/helpers'
import { DEMO_ANSWER, DEMO_JOB, DEMO_QUESTION, JOB_FAMILIES } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type Field = 'jobFamily' | 'jobTitle' | 'question' | 'answer' | 'charLimit'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs font-medium text-bad-ink">
      {message}
    </p>
  )
}

export function InputPanel() {
  const {
    form,
    setField,
    errors,
    isValid,
    apiKey,
    phase,
    requestDiagnose,
    answerMode,
    setAnswerMode,
    result,
    focusEvidence,
  } = useAppStore()
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [showAll, setShowAll] = useState(false)
  const uid = useId()
  const ids = {
    family: `${uid}-family`,
    title: `${uid}-title`,
    question: `${uid}-question`,
    answer: `${uid}-answer`,
    limit: `${uid}-limit`,
    spaces: `${uid}-spaces`,
  }

  const visibleError = (field: Field) => (showAll || touched[field] ? errors[field] : undefined)
  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }))
  const scanning = phase === 'scanning'
  const count = countChars(form.answer, form.countSpaces)

  const loadExample = () => {
    setField('jobFamily', DEMO_JOB.jobFamily)
    setField('jobTitle', DEMO_JOB.jobTitle)
    setField('question', DEMO_QUESTION)
    setField('answer', DEMO_ANSWER)
    setField('charLimit', 600)
    setAnswerMode('edit')
  }

  const onDiagnose = () => {
    if (apiKey && !isValid) {
      setShowAll(true)
      return
    }
    requestDiagnose()
  }

  const familyLabel = JOB_FAMILIES.find((f) => f.value === form.jobFamily)?.label

  return (
    <section
      aria-labelledby={`${uid}-heading`}
      className="flex flex-col gap-5 rounded-2xl border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={`${uid}-heading`} className="flex items-center gap-2 text-base font-bold">
          <FileText className="size-4.5 text-primary" aria-hidden />내 자소서
        </h2>
        <button
          type="button"
          onClick={loadExample}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Sparkles className="size-3.5" aria-hidden />
          예시 불러오기
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.family}>직군</Label>
          <Select
            items={JOB_FAMILIES}
            value={form.jobFamily || null}
            onValueChange={(v) => {
              setField('jobFamily', (v as string | null) ?? '')
              touch('jobFamily')
            }}
          >
            <SelectTrigger
              id={ids.family}
              className="h-10 w-full rounded-xl"
              aria-invalid={!!visibleError('jobFamily')}
              aria-describedby={visibleError('jobFamily') ? `${ids.family}-err` : undefined}
            >
              <SelectValue>
                {() => (
                  <span className={cn(!familyLabel && 'text-muted-foreground')}>
                    {familyLabel ?? '직군 선택'}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {JOB_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${ids.family}-err`} message={visibleError('jobFamily')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.title}>직무명</Label>
          <Input
            id={ids.title}
            value={form.jobTitle}
            maxLength={40}
            placeholder="예: 서비스기획"
            onChange={(e) => setField('jobTitle', e.target.value)}
            onBlur={() => touch('jobTitle')}
            aria-invalid={!!visibleError('jobTitle')}
            aria-describedby={visibleError('jobTitle') ? `${ids.title}-err` : undefined}
            className="h-10 rounded-xl"
          />
          <FieldError id={`${ids.title}-err`} message={visibleError('jobTitle')} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={ids.question}>자소서 문항</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{form.question.length}/500</span>
        </div>
        <Textarea
          id={ids.question}
          value={form.question}
          rows={2}
          placeholder="회사가 제시한 문항을 그대로 붙여넣으세요"
          onChange={(e) => setField('question', e.target.value)}
          onBlur={() => touch('question')}
          aria-invalid={!!visibleError('question')}
          aria-describedby={visibleError('question') ? `${ids.question}-err` : undefined}
          className="min-h-16 resize-y rounded-xl text-[15px] leading-6"
        />
        <FieldError id={`${ids.question}-err`} message={visibleError('question')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={answerMode === 'edit' ? ids.answer : undefined}>답변</Label>
          {answerMode === 'read' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAnswerMode('edit')}
              className="rounded-lg"
            >
              <PencilLine data-icon="inline-start" aria-hidden />
              수정하기
            </Button>
          )}
        </div>
        {answerMode === 'read' ? (
          <AnswerHighlighter answer={form.answer} criteria={result?.criteria ?? []} focus={focusEvidence} />
        ) : (
          <Textarea
            id={ids.answer}
            value={form.answer}
            autoFocus={!!result}
            placeholder="작성한 답변을 붙여넣으세요 (50자 이상)"
            onChange={(e) => setField('answer', e.target.value)}
            onBlur={() => touch('answer')}
            aria-invalid={!!visibleError('answer')}
            aria-describedby={visibleError('answer') ? `${ids.answer}-err` : undefined}
            className="min-h-64 resize-y rounded-xl text-[15px] leading-7"
          />
        )}
        <FieldError id={`${ids.answer}-err`} message={visibleError('answer')} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor={ids.limit} className="text-xs whitespace-nowrap">
              글자수 제한
            </Label>
            <Input
              id={ids.limit}
              type="number"
              inputMode="numeric"
              min={100}
              max={5000}
              step={100}
              value={Number.isFinite(form.charLimit) ? form.charLimit : ''}
              onChange={(e) => setField('charLimit', Number.parseInt(e.target.value, 10))}
              onBlur={() => touch('charLimit')}
              aria-invalid={!!visibleError('charLimit')}
              className="h-8 w-24 rounded-lg bg-card font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={ids.spaces}
              checked={form.countSpaces}
              onCheckedChange={(checked) => setField('countSpaces', checked)}
            />
            <Label htmlFor={ids.spaces} className="text-xs">
              공백 포함
            </Label>
          </div>
        </div>
        <CharGauge count={count} limit={form.charLimit} />
        <FieldError id={`${ids.limit}-err`} message={visibleError('charLimit')} />
      </div>

      <Button
        type="button"
        onClick={onDiagnose}
        disabled={scanning}
        aria-disabled={!!apiKey && !isValid}
        className={cn(
          'h-12 w-full rounded-xl text-base font-bold',
          apiKey && !isValid && 'opacity-60',
        )}
      >
        {scanning ? (
          <>
            <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
            진단 중...
          </>
        ) : apiKey ? (
          <>
            <ScanSearch data-icon="inline-start" aria-hidden />
            {result ? '다시 진단하기' : '진단하기'}
          </>
        ) : (
          <>
            <KeyRound data-icon="inline-start" aria-hidden />
            무료 키 연결하고 진단하기
          </>
        )}
      </Button>
    </section>
  )
}
