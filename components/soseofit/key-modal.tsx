'use client'

import { AlertCircle, ExternalLink, KeyRound, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore, type KeyStorageMode } from '@/components/soseofit/app-store'
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
import { Label } from '@/components/ui/label'

export function KeyModal() {
  const { apiKey, keyStorage, connectKey, disconnectKey, keyModal, closeKeyModal } = useAppStore()
  const [keyInput, setKeyInput] = useState('')
  const [storageMode, setStorageMode] = useState<KeyStorageMode>('local')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (keyModal.open) {
      setKeyInput(apiKey ?? '')
      setStorageMode(keyStorage)
      setError(null)
    }
  }, [keyModal.open, apiKey, keyStorage])

  const handleSave = () => {
    const trimmed = keyInput.trim()
    if (!trimmed) {
      setError('키를 입력해 주세요.')
      return
    }
    if (trimmed.length < 10) {
      setError('올바른 API 키 형식이 아니에요.')
      return
    }
    setError(null)
    connectKey(trimmed, storageMode)
  }

  const handleDisconnect = () => {
    disconnectKey()
    setKeyInput('')
    closeKeyModal()
  }

  return (
    <Dialog open={keyModal.open} onOpenChange={(open) => !open && closeKeyModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="size-4" aria-hidden />
            </div>
            <DialogTitle>무료 Gemini API 키 연결</DialogTitle>
          </div>
          <DialogDescription>
            구글 AI 스튜디오에서 발급받은 무료 키를 입력하면 바로 자소서 진단을 시작할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        {keyModal.reason && (
          <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad-soft p-3 text-xs text-bad-ink">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" aria-hidden />
            <span>{keyModal.reason}</span>
          </div>
        )}

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gemini-api-key" className="text-xs font-semibold">
              API 키
            </Label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value)
                if (error) setError(null)
              }}
              className="font-mono text-sm rounded-xl h-10"
            />
            {error && (
              <p className="flex items-center gap-1 text-xs text-bad-ink font-medium">
                <AlertCircle className="size-3.5" aria-hidden />
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 text-xs">
            <span className="font-semibold text-foreground/90">저장 방식</span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${
                  storageMode === 'local' ? 'border-primary bg-primary/5 font-semibold text-primary' : 'bg-card'
                }`}
              >
                <input
                  type="radio"
                  name="storageMode"
                  value="local"
                  checked={storageMode === 'local'}
                  onChange={() => setStorageMode('local')}
                  className="sr-only"
                />
                <span className="size-2 rounded-full border border-current" />
                기기에 저장 (추천)
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${
                  storageMode === 'session' ? 'border-primary bg-primary/5 font-semibold text-primary' : 'bg-card'
                }`}
              >
                <input
                  type="radio"
                  name="storageMode"
                  value="session"
                  checked={storageMode === 'session'}
                  onChange={() => setStorageMode('session')}
                  className="sr-only"
                />
                <span className="size-2 rounded-full border border-current" />
                창 닫을 때 삭제
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              키는 사용자의 브라우저에만 보관되며, 소서핏 백엔드나 타사 서버로 전송되지 않습니다.
            </p>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-xs">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              무료 키 발급받기
              <ExternalLink className="size-3" aria-hidden />
            </a>
            {apiKey && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-bad-ink"
              >
                <Trash2 className="size-3" aria-hidden />
                키 연결 해제
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={closeKeyModal} className="rounded-xl">
            취소
          </Button>
          <Button type="button" onClick={handleSave} className="rounded-xl">
            {apiKey ? '키 변경하기' : '키 연결하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

