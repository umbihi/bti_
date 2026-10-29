'use client'

import { AlertTriangle, Plus, ShieldCheck, UserCheck, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useAppStore } from '@/components/soseofit/app-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export function MaskModal() {
  const {
    maskOpen,
    setMaskOpen,
    maskResult,
    confirmSend,
    customWords,
    addCustomWord,
    removeCustomWord,
  } = useAppStore()

  const [inputWord, setInputWord] = useState('')

  const handleAddWord = () => {
    const trimmed = inputWord.trim()
    if (!trimmed) return
    addCustomWord(trimmed)
    setInputWord('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddWord()
    }
  }

  const totalMasked =
    maskResult.counts.name +
    maskResult.counts.school +
    maskResult.counts.contact +
    maskResult.counts.custom

  return (
    <Dialog open={maskOpen} onOpenChange={setMaskOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-4" aria-hidden />
            </div>
            <DialogTitle>개인정보 가명 처리 실드</DialogTitle>
          </div>
          <DialogDescription>
            AI에게 전송되기 전, 민감한 개인정보를 임의의 가명 토큰으로 대체하여 안전하게 보호합니다.
          </DialogDescription>
        </DialogHeader>

        {maskResult.hasRRN && (
          <div className="flex items-start gap-2.5 rounded-xl border border-bad/40 bg-bad-soft p-3 text-xs text-bad-ink">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-bad" aria-hidden />
            <div>
              <p className="font-bold">주민등록번호 패턴이 감지되었습니다</p>
              <p className="mt-0.5 leading-relaxed">
                법적 규제 및 개인정보 보호를 위해 주민등록번호가 포함된 자소서는 진단할 수 없습니다. 답변에서 주민등록번호를 직접 지운 후 다시 시도해 주세요.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 py-2">
          {/* 가명 처리 감지 통계 */}
          <div className="rounded-xl border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-primary" aria-hidden />
                자동 감지된 항목
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                총 {totalMasked}개 토큰 변환
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 border text-muted-foreground">
                이름 <strong className="text-foreground">{maskResult.counts.name}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 border text-muted-foreground">
                학교 <strong className="text-foreground">{maskResult.counts.school}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 border text-muted-foreground">
                연락처·주소 <strong className="text-foreground">{maskResult.counts.contact}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 border text-muted-foreground">
                직접 가림 <strong className="text-foreground">{maskResult.counts.custom}</strong>
              </span>
            </div>
          </div>

          {/* 직접 가릴 단어 추가 */}
          <div className="flex flex-col gap-2">
            <label htmlFor="custom-mask-input" className="text-xs font-semibold text-foreground/80">
              직접 가릴 단어 추가 (예: 회사명, 동아리명, 프로젝트명)
            </label>
            <div className="flex gap-2">
              <Input
                id="custom-mask-input"
                placeholder="가릴 단어를 입력하세요"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 rounded-xl text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddWord}
                className="rounded-xl shrink-0"
              >
                <Plus className="size-3.5" data-icon="inline-start" aria-hidden />
                추가
              </Button>
            </div>

            {customWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto p-1">
                {customWords.map((word) => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-0.5 text-[11px] rounded-lg"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomWord(word)}
                      className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                      aria-label={`${word} 삭제`}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 가명화 미리보기 */}
          {maskResult.masked[1] && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">전송될 답변 미리보기</span>
              <div className="max-h-32 overflow-y-auto rounded-xl border bg-muted/20 p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap text-foreground/80">
                {maskResult.masked[1]}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMaskOpen(false)}
            className="rounded-xl"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={confirmSend}
            disabled={maskResult.hasRRN}
            className="rounded-xl"
          >
            <ShieldCheck data-icon="inline-start" aria-hidden />
            가명 처리하여 진단 전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

