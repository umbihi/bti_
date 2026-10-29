'use client'

import { useReducedMotion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { showAchievementToast } from '@/components/soseofit/achievement-toast'
import type { AchievementId } from '@/lib/achievements'
import { DiagnoseError, diagnose, resetDiagnoseMock } from '@/lib/diagnose'
import { SNAPSHOT_SEP, compareResults, dateKey, isAllClear } from '@/lib/helpers'
import { maskSignature, maskTexts, unmaskResult, type MaskResult } from '@/lib/mask'
import {
  DEMO_ANSWER,
  DEMO_JOB,
  DEMO_PII_ANSWER,
  DEMO_QUESTION,
  MOCK_ALL_CLEAR,
  MOCK_BASE,
  MOCK_IMPROVED,
} from '@/lib/mock-data'
import {
  STORAGE_KEYS,
  ensureAnonId,
  readJSON,
  readString,
  removeKey,
  writeJSON,
  writeString,
} from '@/lib/storage'
import type { DiagnoseErrorCode, DiagnoseResult } from '@/lib/types'

export type Phase = 'idle' | 'scanning' | 'result'
export type KeyStorageMode = 'local' | 'session'
export type Notice =
  | { kind: 'cooldown_minute'; until: number }
  | { kind: 'cooldown_day' }
  | { kind: 'timeout' }
  | { kind: 'not_cover_letter' }
  | { kind: 'network' }

export type DevPreset =
  | 'empty'
  | 'no-key'
  | 'typing'
  | 'mask'
  | 'scanning'
  | 'result'
  | 'levelup'
  | 'allclear'
  | 'cooldown-minute'
  | 'cooldown-day'
  | 'season'

export interface FormState {
  jobFamily: string
  jobTitle: string
  question: string
  answer: string
  charLimit: number
  countSpaces: boolean
}

type FieldName = 'jobFamily' | 'jobTitle' | 'question' | 'answer' | 'charLimit'

const EMPTY_FORM: FormState = {
  jobFamily: '',
  jobTitle: '',
  question: '',
  answer: '',
  charLimit: 1000,
  countSpaces: true,
}

const DEV_KEY = 'AIza-dev-preview-key'
const TIMEOUT_MS = 30_000

export function validateForm(form: FormState): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {}
  const title = form.jobTitle.trim()
  const question = form.question.trim()
  const answerLength = form.answer.length

  if (!form.jobFamily) errors.jobFamily = '직군을 선택해 주세요.'

  if (!title) errors.jobTitle = '직무명을 입력해 주세요.'
  else if (title.length < 2) errors.jobTitle = '직무명은 2자 이상 입력해 주세요.'
  else if (title.length > 30) errors.jobTitle = '직무명은 30자 이하로 입력해 주세요.'

  if (!question) errors.question = '문항을 입력해 주세요.'
  else if (question.length < 5) errors.question = '문항은 5자 이상 입력해 주세요.'
  else if (question.length > 500) errors.question = '문항은 500자 이하로 입력해 주세요.'

  if (!form.answer.trim()) errors.answer = '답변을 입력해 주세요.'
  else if (answerLength < 50) errors.answer = `답변은 50자 이상 입력해 주세요. (지금 ${answerLength}자)`
  else if (answerLength > 2000)
    errors.answer = `답변은 2,000자 이하로 입력해 주세요. (지금 ${answerLength.toLocaleString()}자)`

  if (!Number.isFinite(form.charLimit) || form.charLimit < 100 || form.charLimit > 5000)
    errors.charLimit = '글자수 제한은 100~5,000자 사이로 입력해 주세요.'

  return errors
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isDesktop() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
}

function useStoreState() {
  const reduceMotion = useReducedMotion()

  const [hydrated, setHydrated] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [customWords, setCustomWords] = useState<string[]>([])
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyStorage, setKeyStorage] = useState<KeyStorageMode>('local')
  const [keyModal, setKeyModal] = useState<{ open: boolean; reason?: string }>({ open: false })
  const [maskOpen, setMaskOpen] = useState(false)
  const [approvedSignature, setApprovedSignature] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [scanDone, setScanDone] = useState(false)
  const [result, setResult] = useState<DiagnoseResult | null>(null)
  const [prevResult, setPrevResult] = useState<DiagnoseResult | null>(null)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [diagnosisId, setDiagnosisId] = useState(0)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [answerMode, setAnswerMode] = useState<'edit' | 'read'>('edit')
  const [questChecks, setQuestChecks] = useState<number[]>([])
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({})
  const [focusEvidence, setFocusEvidenceState] = useState<{ text: string; nonce: number } | null>(
    null,
  )
  const [mobileTab, setMobileTabState] = useState<'input' | 'result'>('input')
  const [resultDot, setResultDot] = useState(false)
  const [stamps, setStamps] = useState<string[]>([])
  const [achievements, setAchievements] = useState<AchievementId[]>([])
  const [seasonOpen, setSeasonOpen] = useState(false)

  const achievementsRef = useRef<AchievementId[]>([])
  const stampsRef = useRef<string[]>([])
  const questCheckTotal = useRef(0)
  const requestIdRef = useRef(0)
  const latest = useRef({ result, phase, mobileTab, apiKey, form })

  useEffect(() => {
    latest.current = { result, phase, mobileTab, apiKey, form }
  })

  useEffect(() => {
    const prefs = readJSON<{ jobFamily?: string; jobTitle?: string; customWords?: string[] }>(
      STORAGE_KEYS.prefs,
      {},
    )
    setForm((f) => ({
      ...f,
      jobFamily: typeof prefs.jobFamily === 'string' ? prefs.jobFamily : '',
      jobTitle: typeof prefs.jobTitle === 'string' ? prefs.jobTitle : '',
    }))
    setCustomWords(Array.isArray(prefs.customWords) ? prefs.customWords.slice(0, 50) : [])

    const localKey = readString(STORAGE_KEYS.apiKey, 'local')
    const sessionKey = readString(STORAGE_KEYS.apiKey, 'session')
    if (localKey) {
      setApiKey(localKey)
      setKeyStorage('local')
    } else if (sessionKey) {
      setApiKey(sessionKey)
      setKeyStorage('session')
    }

    const storedStamps = readJSON<string[]>(STORAGE_KEYS.stamps, [])
    const storedAchievements = readJSON<AchievementId[]>(STORAGE_KEYS.achievements, [])
    stampsRef.current = Array.isArray(storedStamps) ? storedStamps : []
    achievementsRef.current = Array.isArray(storedAchievements) ? storedAchievements : []
    setStamps(stampsRef.current)
    setAchievements(achievementsRef.current)

    ensureAnonId()
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    writeJSON(STORAGE_KEYS.prefs, {
      jobFamily: form.jobFamily,
      jobTitle: form.jobTitle,
      customWords,
    })
  }, [hydrated, form.jobFamily, form.jobTitle, customWords])

  const maskResult: MaskResult = useMemo(
    () => maskTexts([form.question, form.answer], customWords),
    [form.question, form.answer, customWords],
  )
  const signature = useMemo(() => maskSignature(maskResult, customWords), [maskResult, customWords])
  const shieldApplied = approvedSignature !== null && approvedSignature === signature

  const errors = useMemo(() => validateForm(form), [form])
  const isValid = Object.keys(errors).length === 0
  const currentSnapshot = form.question + SNAPSHOT_SEP + form.answer
  const isStale = result !== null && snapshot !== null && snapshot !== currentSnapshot

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  const unlock = useCallback((id: AchievementId) => {
    if (achievementsRef.current.includes(id)) return
    const next = [...achievementsRef.current, id]
    achievementsRef.current = next
    setAchievements(next)
    writeJSON(STORAGE_KEYS.achievements, next)
    showAchievementToast(id)
  }, [])

  const recordStamp = useCallback(() => {
    const today = dateKey()
    if (!stampsRef.current.includes(today)) {
      const next = [...stampsRef.current, today].slice(-120)
      stampsRef.current = next
      setStamps(next)
      writeJSON(STORAGE_KEYS.stamps, next)
    }
    if (stampsRef.current.length >= 3) unlock('season_runner')
  }, [unlock])

  const setMobileTab = useCallback((tab: 'input' | 'result') => {
    setMobileTabState(tab)
    if (tab === 'result') setResultDot(false)
  }, [])

  const handleError = useCallback((code: DiagnoseErrorCode) => {
    switch (code) {
      case 'KEY_INVALID':
        setKeyModal({ open: true, reason: '키를 확인해 주세요. 키가 만료됐거나 잘못 복사됐을 수 있어요.' })
        toast.error('키를 확인해 주세요')
        break
      case 'RATE_LIMIT_MINUTE':
        setNotice({ kind: 'cooldown_minute', until: Date.now() + 60_000 })
        break
      case 'RATE_LIMIT_DAY':
        setNotice({ kind: 'cooldown_day' })
        break
      case 'TIMEOUT':
        setNotice({ kind: 'timeout' })
        break
      case 'NOT_COVER_LETTER':
        setNotice({ kind: 'not_cover_letter' })
        break
      default:
        setNotice({ kind: 'network' })
    }
  }, [])

  const runDiagnose = useCallback(
    async (mask: MaskResult) => {
      const { apiKey: key, form: currentForm, phase: currentPhase } = latest.current
      if (!key || currentPhase === 'scanning') return

      const requestId = ++requestIdRef.current
      latest.current.phase = 'scanning'
      setPhase('scanning')
      setScanDone(false)
      setNotice(null)
      setLevelUpOpen(false)
      setMobileTab('result')

      const snap = currentForm.question + SNAPSHOT_SEP + currentForm.answer
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(new DiagnoseError('TIMEOUT')), TIMEOUT_MS)

      try {
        const raw = await diagnose(
          { ...currentForm, question: mask.masked[0], answer: mask.masked[1] },
          { apiKey: key, signal: controller.signal },
        )
        clearTimeout(timer)
        if (requestId !== requestIdRef.current) return

        const next = unmaskResult(raw, mask.map)
        setScanDone(true)
        await sleep(reduceMotion ? 0 : 600)
        if (requestId !== requestIdRef.current) return

        const previous = latest.current.result
        setPrevResult(previous)
        setResult(next)
        setSnapshot(snap)
        setDiagnosisId((i) => i + 1)
        setQuestChecks([])
        setFocusEvidenceState(null)
        setAnswerMode('read')
        setPhase('result')
        if (latest.current.mobileTab === 'input') setResultDot(true)

        recordStamp()
        unlock('first_diagnosis')
        if (previous && compareResults(previous, next).some((c) => c.delta > 0)) {
          setLevelUpOpen(true)
          unlock('first_levelup')
        }
        if (isAllClear(next)) unlock('all_clear')
      } catch (err) {
        clearTimeout(timer)
        if (requestId !== requestIdRef.current) return
        setPhase(latest.current.result ? 'result' : 'idle')
        const code: DiagnoseErrorCode =
          err instanceof DiagnoseError ? err.code : controller.signal.aborted ? 'TIMEOUT' : 'NETWORK'
        handleError(code)
      }
    },
    [handleError, recordStamp, reduceMotion, setMobileTab, unlock],
  )

  const requestDiagnose = useCallback(() => {
    if (!apiKey) {
      setKeyModal({ open: true })
      return
    }
    if (!isValid || phase === 'scanning') return
    if (!maskResult.hasRRN && shieldApplied) {
      runDiagnose(maskResult)
      return
    }
    setMaskOpen(true)
  }, [apiKey, isValid, phase, maskResult, shieldApplied, runDiagnose])

  const confirmSend = useCallback(() => {
    if (maskResult.hasRRN) return
    setApprovedSignature(signature)
    setMaskOpen(false)
    runDiagnose(maskResult)
  }, [maskResult, signature, runDiagnose])

  const connectKey = useCallback(
    (key: string, mode: KeyStorageMode) => {
      removeKey(STORAGE_KEYS.apiKey, 'local')
      removeKey(STORAGE_KEYS.apiKey, 'session')
      writeString(STORAGE_KEYS.apiKey, key, mode)
      setApiKey(key)
      setKeyStorage(mode)
      setKeyModal({ open: false })
      unlock('equip')
    },
    [unlock],
  )

  const disconnectKey = useCallback(() => {
    removeKey(STORAGE_KEYS.apiKey, 'local')
    removeKey(STORAGE_KEYS.apiKey, 'session')
    setApiKey(null)
  }, [])

  const addCustomWord = useCallback((word: string) => {
    const w = word.trim()
    if (!w) return
    setCustomWords((prev) => (prev.includes(w) ? prev : [...prev, w].slice(0, 50)))
  }, [])

  const removeCustomWord = useCallback((word: string) => {
    setCustomWords((prev) => prev.filter((w) => w !== word))
  }, [])

  const toggleQuest = useCallback(
    (index: number) => {
      if (questChecks.includes(index)) {
        setQuestChecks(questChecks.filter((i) => i !== index))
        return
      }
      setQuestChecks([...questChecks, index])
      questCheckTotal.current += 1
      if (questCheckTotal.current >= 3) unlock('quest_master')
    },
    [questChecks, unlock],
  )

  const setFocusEvidence = useCallback((text: string) => {
    if (!isDesktop()) return
    setAnswerMode('read')
    setFocusEvidenceState({ text, nonce: Date.now() })
  }, [])

  const copyAnswer = useCallback(async (message = '답변을 복사했어요') => {
    try {
      await navigator.clipboard.writeText(latest.current.form.answer)
      toast.success(message)
      return true
    } catch {
      toast.error('복사하지 못했어요. 답변란에서 직접 선택해 복사해 주세요.')
      return false
    }
  }, [])

  const startNextQuestion = useCallback(async () => {
    await copyAnswer('답변을 복사했어요. 다음 회사 문항을 써 볼까요?')
    requestIdRef.current++
    setForm((f) => ({ ...f, question: '', answer: '' }))
    setResult(null)
    setPrevResult(null)
    setSnapshot(null)
    setLevelUpOpen(false)
    setPhase('idle')
    setNotice(null)
    setAnswerMode('edit')
    setQuestChecks([])
    setMobileTab('input')
  }, [copyAnswer, setMobileTab])

  const sendFeedback = useCallback(
    (value: 'up' | 'down', reason?: string) => {
      setFeedback((prev) => (prev[diagnosisId] ? prev : { ...prev, [diagnosisId]: value }))
      toast.success(
        value === 'up' ? '의견 고마워요. 더 정확하게 다듬을게요.' : `의견 고마워요${reason ? ` (${reason})` : ''}.`,
      )
    },
    [diagnosisId],
  )

  const resetRecords = useCallback(() => {
    stampsRef.current = []
    achievementsRef.current = []
    questCheckTotal.current = 0
    setStamps([])
    setAchievements([])
    removeKey(STORAGE_KEYS.stamps)
    removeKey(STORAGE_KEYS.achievements)
    toast.success('기록을 초기화했어요')
  }, [])

  const applyPreset = useCallback(
    (preset: DevPreset) => {
      requestIdRef.current++
      const base = () => {
        setPhase('idle')
        setScanDone(false)
        setNotice(null)
        setLevelUpOpen(false)
        setMaskOpen(false)
        setSeasonOpen(false)
        setKeyModal({ open: false })
      }
      const clearResult = () => {
        setResult(null)
        setPrevResult(null)
        setSnapshot(null)
        setQuestChecks([])
      }
      const ensureKey = () => {
        if (!latest.current.apiKey) setApiKey(DEV_KEY)
      }
      const fillExample = (answer = DEMO_ANSWER) =>
        setForm((f) => ({ ...f, ...DEMO_JOB, question: DEMO_QUESTION, answer, charLimit: 600 }))
      const showResult = (prev: DiagnoseResult | null, next: DiagnoseResult) => {
        setPrevResult(prev)
        setResult(next)
        setSnapshot(DEMO_QUESTION + SNAPSHOT_SEP + DEMO_ANSWER)
        setDiagnosisId((i) => i + 1)
        setQuestChecks([])
        setAnswerMode('read')
        setPhase('result')
        setMobileTab('result')
      }

      switch (preset) {
        case 'empty':
          base()
          clearResult()
          setForm((f) => ({ ...f, question: '', answer: '' }))
          setAnswerMode('edit')
          setMobileTab('result')
          resetDiagnoseMock()
          break
        case 'no-key':
          base()
          clearResult()
          disconnectKey()
          setAnswerMode('edit')
          setKeyModal({ open: true })
          break
        case 'typing':
          base()
          clearResult()
          ensureKey()
          fillExample()
          setAnswerMode('edit')
          setMobileTab('input')
          resetDiagnoseMock()
          break
        case 'mask':
          base()
          ensureKey()
          fillExample(DEMO_PII_ANSWER)
          setApprovedSignature(null)
          setAnswerMode('edit')
          setMaskOpen(true)
          break
        case 'scanning':
          base()
          ensureKey()
          fillExample()
          setPhase('scanning')
          setMobileTab('result')
          break
        case 'result':
          base()
          ensureKey()
          fillExample()
          showResult(null, MOCK_BASE)
          break
        case 'levelup':
          base()
          ensureKey()
          fillExample()
          showResult(MOCK_BASE, MOCK_IMPROVED)
          setLevelUpOpen(true)
          break
        case 'allclear':
          base()
          ensureKey()
          fillExample()
          showResult(MOCK_IMPROVED, MOCK_ALL_CLEAR)
          setLevelUpOpen(true)
          break
        case 'cooldown-minute':
          base()
          ensureKey()
          fillExample()
          setPhase(latest.current.result ? 'result' : 'idle')
          setNotice({ kind: 'cooldown_minute', until: Date.now() + 60_000 })
          setMobileTab('result')
          break
        case 'cooldown-day':
          base()
          ensureKey()
          fillExample()
          setPhase(latest.current.result ? 'result' : 'idle')
          setNotice({ kind: 'cooldown_day' })
          setMobileTab('result')
          break
        case 'season':
          base()
          if (latest.current.result) setPhase('result')
          setSeasonOpen(true)
          break
      }
    },
    [disconnectKey, setMobileTab],
  )

  return {
    hydrated,
    form,
    setField,
    errors,
    isValid,
    customWords,
    addCustomWord,
    removeCustomWord,
    apiKey,
    keyStorage,
    connectKey,
    disconnectKey,
    keyModal,
    openKeyModal: (reason?: string) => setKeyModal({ open: true, reason }),
    closeKeyModal: () => setKeyModal({ open: false }),
    maskOpen,
    setMaskOpen,
    maskResult,
    shieldApplied,
    confirmSend,
    phase,
    scanDone,
    result,
    prevResult,
    isStale,
    diagnosisId,
    levelUpOpen,
    setLevelUpOpen,
    notice,
    clearNotice: () => setNotice(null),
    answerMode,
    setAnswerMode,
    questChecks,
    toggleQuest,
    feedback,
    sendFeedback,
    focusEvidence,
    setFocusEvidence,
    mobileTab,
    setMobileTab,
    resultDot,
    stamps,
    achievements,
    resetRecords,
    seasonOpen,
    setSeasonOpen,
    requestDiagnose,
    copyAnswer,
    startNextQuestion,
    applyPreset,
  }
}

type AppStore = ReturnType<typeof useStoreState>

const AppStoreContext = createContext<AppStore | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreState()
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
