/**
 * Phase 0 실측 QA (Gemini API 키 필요)
 *  - 판정 일관성: 동일 입력 N회 반복 시 5개 항목 판정 일치율 (기준 80% 이상)
 *  - 환각 인용: 검증 필터 이전 원본 응답의 근거/수정 원문 중 원문에 없는 건수
 *  - 응답 지연: p50/p95 (기준 p95 < 20초)
 *  - 전송문 개인정보 노출 (기준 0건)
 *
 * 실행 예:
 *   GEMINI_API_KEY=... tsx qa/run-live.mts
 *   GEMINI_API_KEY=... RUNS=3 DELAY_MS=5000 ONLY=biz-1,it-1 MODEL=gemini-3.1-flash-lite tsx qa/run-live.mts
 *
 * 키는 환경변수로만 받고 파일/출력에 기록하지 않는다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { maskTexts } from '../lib/mask'
import {
  DEFAULT_MODEL,
  DiagnoseError,
  buildDiagnosePrompt,
  requestGeminiRaw,
  validateAndSanitizeResult,
} from '../lib/diagnose'
import type { DiagnoseInput, Verdict } from '../lib/types'

interface Case {
  id: string
  family: string
  kind: string
  jobTitle: string
  question: string
  answer: string
  expect: { block?: string; pii?: string[]; minSufficient?: number; maxSufficient?: number }
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY 환경변수가 필요합니다.')
  process.exit(2)
}
const RUNS = Number(process.env.RUNS || 3)
const DELAY_MS = Number(process.env.DELAY_MS || 4500)
const TIMEOUT_MS = 30_000 // 앱의 하드 타임아웃(app-store.tsx)과 동일
const P95_TARGET_MS = 20_000
const MODEL = process.env.MODEL || DEFAULT_MODEL
const ONLY = process.env.ONLY?.split(',').map((s) => s.trim()).filter(Boolean)

const here = dirname(fileURLToPath(import.meta.url))
const { cases: all } = JSON.parse(readFileSync(join(here, 'dataset.json'), 'utf8')) as { cases: Case[] }
const cases = all.filter((c) => !c.expect.block && (!ONLY || ONLY.includes(c.id)))

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const percentile = (xs: number[], p: number) => {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]
}

interface RunOut {
  ok: boolean
  ms: number
  error?: string
  verdicts?: Verdict[]
  rawEvidence?: number
  fakeEvidence?: number
  rawSuggestions?: number
  fakeSuggestions?: number
}

async function callOnce(input: DiagnoseInput): Promise<RunOut> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const t0 = performance.now()
    try {
      const raw = await requestGeminiRaw(input, { apiKey: apiKey!, signal: controller.signal, model: MODEL })
      clearTimeout(timer)
      const ms = performance.now() - t0
      const answer = norm(input.answer)
      const evid = raw.criteria.flatMap((c) => c.evidence || [])
      const fakeEvi = evid.filter((e) => !(norm(e).length > 2 && answer.includes(norm(e)))).length
      const sug = raw.suggestions || []
      const fakeSug = sug.filter((s) => !(norm(s.original || '').length > 3 && answer.includes(norm(s.original)))).length
      const clean = validateAndSanitizeResult(raw, input.answer)
      return {
        ok: true,
        ms,
        verdicts: clean.criteria.map((c) => c.verdict),
        rawEvidence: evid.length,
        fakeEvidence: fakeEvi,
        rawSuggestions: sug.length,
        fakeSuggestions: fakeSug,
      }
    } catch (err) {
      clearTimeout(timer)
      const ms = performance.now() - t0
      if (err instanceof DiagnoseError && err.code === 'RATE_LIMIT_MINUTE' && attempt < 2) {
        console.log('    429(분당) → 65초 대기 후 재시도')
        await sleep(65_000)
        continue
      }
      if (err instanceof DiagnoseError && /\((500|502|503|504)\)/.test(err.message) && attempt < 2) {
        console.log(`    서버 일시 오류(${err.message.slice(0, 30)}) → 10초 후 재시도`)
        await sleep(10_000)
        continue
      }
      if (err instanceof DiagnoseError && err.code === 'RATE_LIMIT_DAY') {
        console.error('일일 한도 초과: 중단합니다.')
        process.exit(3)
      }
      const msg = controller.signal.aborted ? `TIMEOUT(${TIMEOUT_MS / 1000}s)` : err instanceof Error ? err.message.slice(0, 200) : String(err)
      return { ok: false, ms, error: msg }
    }
  }
  return { ok: false, ms: 0, error: 'RETRY_EXHAUSTED' }
}

const report: any[] = []
const latencies: number[] = []
let calls = 0
let failedCalls = 0
let fakeEviTotal = 0, eviTotal = 0, fakeSugTotal = 0, sugTotal = 0
let piiLeaks = 0
const consistencies: number[] = []
const bandMisses: string[] = []

console.log(`모델 ${MODEL} / 케이스 ${cases.length}건 x ${RUNS}회 / 호출 간격 ${DELAY_MS}ms\n`)

for (const c of cases) {
  const mask = maskTexts([c.question, c.answer], [])
  const input: DiagnoseInput = {
    jobFamily: c.family, jobTitle: c.jobTitle,
    question: mask.masked[0], answer: mask.masked[1],
    charLimit: 1000, countSpaces: true,
  }

  const prompt = buildDiagnosePrompt(input)
  for (const p of c.expect.pii ?? []) if (prompt.includes(p)) piiLeaks++

  const runs: RunOut[] = []
  for (let i = 0; i < RUNS; i++) {
    const out = await callOnce(input)
    runs.push(out)
    calls++
    latencies.push(out.ms)
    if (!out.ok) failedCalls++
    else {
      eviTotal += out.rawEvidence!; fakeEviTotal += out.fakeEvidence!
      sugTotal += out.rawSuggestions!; fakeSugTotal += out.fakeSuggestions!
    }
    await sleep(DELAY_MS)
  }

  const okRuns = runs.filter((r) => r.ok)
  let consistency = NaN
  if (okRuns.length >= 2) {
    let agree = 0
    for (let k = 0; k < 5; k++) if (new Set(okRuns.map((r) => r.verdicts![k])).size === 1) agree++
    consistency = agree / 5
    consistencies.push(consistency)
  }

  const sufficientCounts = okRuns.map((r) => r.verdicts!.slice(0, 4).filter((v) => v === 'sufficient').length)
  const avgSuff = sufficientCounts.length ? sufficientCounts.reduce((a, b) => a + b, 0) / sufficientCounts.length : NaN
  if (c.expect.minSufficient !== undefined && avgSuff < c.expect.minSufficient) bandMisses.push(`${c.id}: 충분 평균 ${avgSuff.toFixed(1)} < ${c.expect.minSufficient}`)
  if (c.expect.maxSufficient !== undefined && avgSuff > c.expect.maxSufficient) bandMisses.push(`${c.id}: 충분 평균 ${avgSuff.toFixed(1)} > ${c.expect.maxSufficient}`)

  console.log(
    `${c.id.padEnd(6)} ${c.kind.padEnd(9)} 일치율 ${Number.isNaN(consistency) ? ' n/a' : (consistency * 100).toFixed(0).padStart(3) + '%'}  ` +
      `지연 ${runs.map((r) => (r.ms / 1000).toFixed(1) + 's' + (r.ok ? '' : '!')).join('/')}  ` +
      `판정 ${okRuns.map((r) => r.verdicts!.map((v) => v[0]).join('')).join(' | ')}`,
  )
  report.push({ id: c.id, kind: c.kind, consistency, avgSufficient: avgSuff, runs })
}

const p50 = percentile(latencies, 50)
const p95 = percentile(latencies, 95)
const meanConsistency = consistencies.length ? consistencies.reduce((a, b) => a + b, 0) / consistencies.length : NaN
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : 'n/a')

console.log('\n=== Phase 0 실측 QA 결과 ===')
console.log(`호출 ${calls}회 / 실패 ${failedCalls}회 (${pct(failedCalls, calls)})`)
console.log(`판정 일관성 평균   : ${(meanConsistency * 100).toFixed(1)}%   기준 80% 이상 → ${meanConsistency >= 0.8 ? 'PASS' : 'FAIL'}`)
console.log(`지연 p50/p95       : ${(p50 / 1000).toFixed(1)}s / ${(p95 / 1000).toFixed(1)}s   기준 p95 < 20s → ${p95 < P95_TARGET_MS ? 'PASS' : 'FAIL'}  (하드 타임아웃 ${TIMEOUT_MS / 1000}s)`)
console.log(`환각 근거(필터 전) : ${fakeEviTotal}/${eviTotal} (${pct(fakeEviTotal, eviTotal)}) → 필터 후 0건 (validateAndSanitizeResult)`)
console.log(`환각 수정원문(필터 전): ${fakeSugTotal}/${sugTotal} (${pct(fakeSugTotal, sugTotal)})`)
console.log(`전송문 개인정보 노출: ${piiLeaks}건   기준 0건 → ${piiLeaks === 0 ? 'PASS' : 'FAIL'}`)
if (bandMisses.length) console.log(`\n[참고] 유형별 기대 범위 이탈:\n  ${bandMisses.join('\n  ')}`)

mkdirSync(join(here, 'results'), { recursive: true })
const file = join(here, 'results', `live-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(file, JSON.stringify({ model: MODEL, runs: RUNS, p50, p95, meanConsistency, fakeEviTotal, eviTotal, fakeSugTotal, sugTotal, piiLeaks, report }, null, 2))
console.log(`\n상세 결과: ${file}`)
