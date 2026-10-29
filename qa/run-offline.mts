/**
 * Phase 0 오프라인 QA (API 키 불필요)
 *  - 가명화 무결성: 전송 프롬프트에 개인정보 노출 0건
 *  - 주민등록번호 차단: 감지율 100%
 *  - 입력 사전 차단(한글 비율/최소 글자수) 정오 판정
 *  - 환각 인용 필터(validateAndSanitizeResult) 동작
 *  - 역가명화 왕복 무결성
 *
 * 실행: tsx qa/run-offline.mts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { maskTexts, unmask } from '../lib/mask'
import { buildDiagnosePrompt, hangulRatio, validateAndSanitizeResult } from '../lib/diagnose'
import type { DiagnoseResult } from '../lib/types'

interface Case {
  id: string
  family: string
  kind: string
  jobTitle: string
  question: string
  answer: string
  expect: { block?: 'rrn' | 'not_cover_letter' | 'too_short'; pii?: string[] }
}

const here = dirname(fileURLToPath(import.meta.url))
const { cases } = JSON.parse(readFileSync(join(here, 'dataset.json'), 'utf8')) as { cases: Case[] }

const MIN_ANSWER = 50
const fails: string[] = []
const fail = (id: string, msg: string) => fails.push(`[${id}] ${msg}`)

let rrnExpected = 0
let rrnDetected = 0
let piiTotal = 0
let piiLeaked = 0
let blockWrong = 0
let hallucinationLeaks = 0
let hallucinationCases = 0
let roundtripBad = 0

for (const c of cases) {
  const mask = maskTexts([c.question, c.answer], [])

  // 1. 주민등록번호
  if (c.expect.block === 'rrn') {
    rrnExpected++
    if (mask.hasRRN) rrnDetected++
    else fail(c.id, '주민등록번호 미감지')
  } else if (mask.hasRRN) {
    fail(c.id, '주민등록번호 오탐')
  }

  // 2. 가명화 무결성 (실제 전송될 프롬프트 기준)
  if (c.expect.pii?.length) {
    const prompt = buildDiagnosePrompt({
      jobFamily: c.family,
      jobTitle: c.jobTitle,
      question: mask.masked[0],
      answer: mask.masked[1],
      charLimit: 1000,
      countSpaces: true,
    })
    for (const p of c.expect.pii) {
      piiTotal++
      if (prompt.includes(p)) {
        piiLeaked++
        fail(c.id, `가명화 누락: "${p}" 가 전송문에 남음`)
      }
    }
  }

  // 3. 사전 차단 정오 판정
  const ratio = hangulRatio(c.answer)
  const tooShort = c.answer.length < MIN_ANSWER
  const predicted = c.expect.block === 'rrn' ? 'rrn' : tooShort ? 'too_short' : ratio < 0.3 ? 'not_cover_letter' : undefined
  const wanted = c.expect.block
  if (predicted !== wanted) {
    blockWrong++
    fail(c.id, `사전 차단 불일치: 기대=${wanted ?? '통과'} 실제=${predicted ?? '통과'} (한글비율 ${ratio.toFixed(2)}, ${c.answer.length}자)`)
  }

  // 4. 역가명화 왕복
  if (unmask(mask.masked[1], mask.map) !== c.answer) {
    roundtripBad++
    fail(c.id, '역가명화 왕복 불일치')
  }

  // 5. 환각 인용 필터 (진단 가능한 케이스만)
  if (!c.expect.block) {
    hallucinationCases++
    const firstSentence = c.answer.split(/(?<=[.!?])\s/)[0]
    const fakeEvidence = '이 문장은 지원자가 쓰지 않은 가짜 인용문입니다 12345'
    const fakeOriginal = '존재하지 않는 원문 문장을 수정 대상으로 지어냄'
    const raw: DiagnoseResult = {
      question_intent: 'x',
      criteria: [1, 2, 3, 4, 5].map((id) => ({
        id,
        name: `c${id}`,
        verdict: 'needs_work' as const,
        evidence: [firstSentence, fakeEvidence],
        feedback: 'f',
      })),
      suggestions: [
        { original: firstSentence, suggested: '수정문', reason: 'r', criterion_id: 2 },
        { original: fakeOriginal, suggested: '수정문', reason: 'r', criterion_id: 2 },
      ],
    }
    const clean = validateAndSanitizeResult(raw, c.answer)
    const leakedEvi = clean.criteria.some((cr) => cr.evidence.includes(fakeEvidence))
    const leakedSug = clean.suggestions.some((s) => s.original === fakeOriginal)
    const keptReal = clean.criteria.every((cr) => cr.evidence.includes(firstSentence)) &&
      clean.suggestions.some((s) => s.original === firstSentence)
    if (leakedEvi || leakedSug) {
      hallucinationLeaks++
      fail(c.id, '환각 인용이 필터를 통과함')
    }
    if (!keptReal) fail(c.id, '정상 인용이 필터에서 제거됨(과필터링)')
  }
}

// 6. 가명화 회귀 시험 (qa/mask-cases.json): 누락(mustMask)과 오탐(mustKeep) 동시 점검
interface MaskCase { id: string; text: string; mustMask: string[]; mustKeep: string[] }
const { cases: maskCases } = JSON.parse(readFileSync(join(here, 'mask-cases.json'), 'utf8')) as { cases: MaskCase[] }
let maskMissed = 0
let maskFalsePos = 0
let maskChecks = 0
for (const mc of maskCases) {
  const out = maskTexts([mc.text], []).masked[0]
  for (const w of mc.mustMask) {
    maskChecks++
    if (out.includes(w)) { maskMissed++; fail(mc.id, `가명화 누락: "${w}"`) }
  }
  for (const w of mc.mustKeep) {
    maskChecks++
    if (!out.includes(w)) { maskFalsePos++; fail(mc.id, `가명화 오탐: "${w}" 가 가려짐`) }
  }
}

const pct = (a: number, b: number) => (b === 0 ? 'n/a' : `${((a / b) * 100).toFixed(1)}%`)
console.log('=== Phase 0 오프라인 QA 결과 ===')
console.log(`케이스 수                : ${cases.length}`)
console.log(`주민번호 차단율          : ${rrnDetected}/${rrnExpected} (${pct(rrnDetected, rrnExpected)})  기준 100%`)
console.log(`가명화 누락              : ${piiLeaked}/${piiTotal} 건 노출            기준 0건`)
console.log(`사전 차단 판정 불일치    : ${blockWrong}건`)
console.log(`환각 인용 필터 누출      : ${hallucinationLeaks}/${hallucinationCases} 건       기준 0건`)
console.log(`역가명화 왕복 불일치     : ${roundtripBad}건`)
console.log(`가명화 회귀 시험         : 누락 ${maskMissed}건 / 오탐 ${maskFalsePos}건 (${maskChecks}개 점검)`)
console.log('')
if (fails.length) {
  console.log(`--- 실패 ${fails.length}건 ---`)
  for (const f of fails) console.log(f)
  process.exit(1)
}
console.log('모든 오프라인 검증 통과')
