'use client'

import { FileText, Sparkles } from 'lucide-react'
import { AppStoreProvider, useAppStore } from '@/components/soseofit/app-store'
import { DevBar } from '@/components/soseofit/dev-bar'
import { Header, OfflineBanner } from '@/components/soseofit/header'
import { InputPanel } from '@/components/soseofit/input-panel'
import { KeyModal } from '@/components/soseofit/key-modal'
import { MaskModal } from '@/components/soseofit/mask-modal'
import { ResultPanel } from '@/components/soseofit/result-panel'
import { SeasonModal } from '@/components/soseofit/season-modal'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

function MainContent() {
  const { mobileTab, setMobileTab, resultDot, result } = useAppStore()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20">
      <OfflineBanner />
      <Header />

      {/* 모바일 탭 네비게이션 */}
      <nav
        aria-label="화면 전환"
        className="sticky top-0 z-30 flex border-b bg-card/90 backdrop-blur lg:hidden"
      >
        <button
          type="button"
          onClick={() => setMobileTab('input')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-bold transition-colors',
            mobileTab === 'input'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="size-4" aria-hidden />
          <span>내 자소서</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('result')}
          className={cn(
            'relative flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-bold transition-colors',
            mobileTab === 'result'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="size-4" aria-hidden />
          <span>진단 결과</span>
          {resultDot && (
            <span
              className="absolute top-2.5 right-[calc(50%-44px)] size-2 rounded-full bg-primary animate-pulse"
              aria-label="새 진단 결과 있음"
            />
          )}
        </button>
      </nav>

      {/* 메인 2열 그리드 컨텐츠 */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* 입력 패널 (모바일에서는 tab이 input일 때만 보이거나 데스크톱에서는 항상 보임) */}
          <div className={cn(mobileTab === 'input' ? 'block' : 'hidden lg:block')}>
            <InputPanel />
          </div>

          {/* 결과 패널 (모바일에서는 tab이 result일 때만 보이거나 데스크톱에서는 항상 보임) */}
          <div className={cn(mobileTab === 'result' ? 'block' : 'hidden lg:block')}>
            <ResultPanel />
          </div>
        </div>
      </main>

      {/* 모달 및 보조 컴포넌트 */}
      <KeyModal />
      <MaskModal />
      <SeasonModal />
      <DevBar />
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}

export default function Page() {
  return (
    <AppStoreProvider>
      <MainContent />
    </AppStoreProvider>
  )
}
