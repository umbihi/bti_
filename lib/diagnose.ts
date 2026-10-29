import { MOCK_ALL_CLEAR, MOCK_BASE, MOCK_IMPROVED, JOB_FAMILIES } from './mock-data'
import type { Criterion, DiagnoseErrorCode, DiagnoseInput, DiagnoseResult, Suggestion, Verdict } from './types'

export class DiagnoseError extends Error {
  code: DiagnoseErrorCode
  constructor(code: DiagnoseErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'DiagnoseError'
    this.code = code
  }
}

export interface DiagnoseOptions {
  apiKey: string
  signal?: AbortSignal
  model?: string
}

let mockCallCount = 0

export function resetDiagnoseMock() {
  mockCallCount = 0
}

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const DEV_KEY = 'AIza-dev-preview-key'

export function hangulRatio(text: string) {
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, '')
  if (letters.length === 0) return 0
  const hangul = letters.match(/[가-힣]/g)?.length ?? 0
  return hangul / letters.length
}

function normalizeSpacing(str: string): string {
  return str.replace(/\s+/g, ' ').trim()
}

/**
 * AI가 생성한 근거 인용(evidence)과 원문 문장(original)이
 * 실제 사용자 답변에 존재하는지 철저히 검증하고 환각 인용을 필터링합니다.
 */
export function validateAndSanitizeResult(raw: DiagnoseResult, sourceAnswer: string): DiagnoseResult {
  const normalizedAnswer = normalizeSpacing(sourceAnswer)

  const sanitizedCriteria: Criterion[] = (raw.criteria || []).map((c) => {
    const validEvidence = (c.evidence || []).filter((evi) => {
      const normalizedEvi = normalizeSpacing(evi)
      return normalizedEvi.length > 2 && normalizedAnswer.includes(normalizedEvi)
    })

    return {
      id: c.id,
      name: c.name || getCriterionName(c.id),
      verdict: sanitizeVerdict(c.verdict),
      evidence: validEvidence,
      feedback: c.feedback || '',
    }
  })

  // 1~5번 항목이 모두 포함되도록 보장
  for (let id = 1; id <= 5; id++) {
    if (!sanitizedCriteria.some((c) => c.id === id)) {
      sanitizedCriteria.push({
        id,
        name: getCriterionName(id),
        verdict: id === 5 ? 'not_applicable' : 'needs_work',
        evidence: [],
        feedback: '항목 검토가 완료되었습니다.',
      })
    }
  }
  sanitizedCriteria.sort((a, b) => a.id - b.id)

  const sanitizedSuggestions: Suggestion[] = (raw.suggestions || [])
    .filter((s) => {
      if (!s.original || !s.suggested) return false
      const normalizedOriginal = normalizeSpacing(s.original)
      return normalizedOriginal.length > 3 && normalizedAnswer.includes(normalizedOriginal)
    })
    .slice(0, 5)

  return {
    question_intent: raw.question_intent || '문항이 묻는 핵심 역량을 평가합니다.',
    criteria: sanitizedCriteria,
    suggestions: sanitizedSuggestions,
  }
}

function sanitizeVerdict(v: unknown): Verdict {
  if (v === 'sufficient' || v === 'needs_work' || v === 'insufficient' || v === 'not_applicable') {
    return v
  }
  return 'needs_work'
}

function getCriterionName(id: number): string {
  switch (id) {
    case 1:
      return '문항 적합도'
    case 2:
      return '두괄식 구조'
    case 3:
      return '경험의 구체성'
    case 4:
      return '직무 연결성'
    case 5:
      return '회사·산업 이해도'
    default:
      return `항목 ${id}`
  }
}

/**
 * Google Gemini API의 responseSchema 구조 정의
 */
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    question_intent: {
      type: 'STRING',
      description: '문항이 지원자에게 묻고자 하는 핵심 역량과 의도 (1~2문장)',
    },
    criteria: {
      type: 'ARRAY',
      description: '5개 평가 기준표 항목별 진단 결과 (id 1~5 필수 포함)',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'INTEGER', description: '기준표 항목 번호 (1: 문항 적합도, 2: 두괄식 구조, 3: 경험의 구체성, 4: 직무 연결성, 5: 회사·산업 이해도)' },
          name: { type: 'STRING', description: '항목 명칭' },
          verdict: {
            type: 'STRING',
            enum: ['sufficient', 'needs_work', 'insufficient', 'not_applicable'],
            description: '판정 등급 (충분: sufficient, 보완: needs_work, 부족: insufficient, 해당없음: not_applicable)',
          },
          evidence: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: '원문에서 글자 그대로 인용한 근거 문장/어절 (원문에 없는 문장을 지어내지 말 것)',
          },
          feedback: { type: 'STRING', description: '구체적인 판정 사유 및 보완 방향 (1~2문장)' },
        },
        required: ['id', 'name', 'verdict', 'evidence', 'feedback'],
      },
    },
    suggestions: {
      type: 'ARRAY',
      description: '원문 문장을 바로 고칠 수 있는 구체적인 수정 제안 (최대 5개)',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING', description: '원문에서 발췌한 수정 대상 문장 (원문과 일치해야 함)' },
          suggested: {
            type: 'STRING',
            description: '지원 직무 역량이 돋보이도록 다듬은 수정 문장. 없는 사실을 지어내지 말고 [수치], [경험] 등 빈칸 활용',
          },
          reason: { type: 'STRING', description: '이 문장을 이렇게 고쳐야 하는 이유 (1문장)' },
          criterion_id: { type: 'INTEGER', description: '연결된 기준표 항목 ID (1~5)' },
        },
        required: ['original', 'suggested', 'reason', 'criterion_id'],
      },
    },
  },
  required: ['question_intent', 'criteria', 'suggestions'],
}

/**
 * 프롬프트 조립 로직
 */
export function buildDiagnosePrompt(input: DiagnoseInput): string {
  const familyLabel = JOB_FAMILIES.find((f) => f.value === input.jobFamily)?.label || input.jobFamily

  return `당신은 10년 차 대기업·공기업 채용 총괄이자 자기소개서 전문 평가관입니다.
지원자가 작성한 자기소개서 문항과 답변을 읽고, 지원 직무에 맞추어 엄격하고 객관적으로 5대 기준표를 진단하고 문장 단위 수정 제안을 작성하세요.

### 지원 정보
- 지원 직군: ${familyLabel}
- 세부 직무: ${input.jobTitle}
- 자소서 문항: ${input.question}
- 자소서 답변:
"""
${input.answer}
"""

### 5대 진단 기준표 및 판정 지침
1. 문항 적합도 (id: 1, name: "문항 적합도")
   - 질문이 요구한 핵심 역량에 직접 답했는가?
   - 충분(sufficient): 핵심 역량에 직접 부합함.
   - 보완(needs_work): 답했으나 일부 불필요한 서술 포함.
   - 부족(insufficient): 질문과 무관한 다른 이야기 중심.

2. 두괄식 구조 (id: 2, name: "두괄식 구조")
   - 첫 문장에서 핵심 성과나 결론을 제시했는가?
   - 충분: 첫 문장이 명확한 주장/결론/성과.
   - 보완: 결론이 2~3번째 문장에 나타남.
   - 부족: 결론이 없거나 맨 마지막에만 배치됨.

3. 경험의 구체성 (id: 3, name: "경험의 구체성")
   - 상황-행동-결과가 정량적 수치 및 구체적 사실과 함께 드러나는가?
   - 충분: STAR 구조 + 구체적 수치나 팩트.
   - 보완: 과정은 있으나 수치가 없거나 성과가 추상적임.
   - 부족: 모호한 형용사('열심히', '많은') 위주의 나열.

4. 직무 연결성 (id: 4, name: "직무 연결성")
   - 경험이 지원 직무(${input.jobTitle})의 실제 업무 역량으로 연결되는가?
   - 충분: 지원 직무 언어로 명시적 연결.
   - 보완: 연결 시도는 있으나 일반론에 그침.
   - 부족: 지원 직무에 대한 고려가 전혀 없음.

5. 회사·산업 이해도 (id: 5, name: "회사·산업 이해도")
   - **주의**: 문항이 지원동기나 회사 관련 질문이 아니라면 반드시 'not_applicable'(해당없음)로 판정하고 evidence는 빈 배열로 두세요.
   - 질문이 회사/지원동기를 묻는 경우에만 충분/보완/부족 판정.

### 엄격한 준수 사항
- **근거 인용(evidence)**: 반드시 지원자가 작성한 답변 원문에서 토씨 하나 틀리지 않고 그대로 복사해 인용하세요. 존재하지 않는 문장을 지어내면 치명적인 오류입니다.
- **수정 제안(suggestions)**: 원문에 없는 허위 경력이나 수치를 임의로 지어내지 마세요. 필요하다면 "[구체적 수치]%", "[기간]"과 같이 빈칸 괄호 표기를 사용하세요. 최대 5개 이내로 작성하세요.
- 모든 출력은 제공된 JSON 스키마를 완벽히 준수해야 합니다.`
}

/**
 * Mock 진단 실행 (데모 키 또는 디버그 테스트 키워드 시 실행)
 */
async function runMockDiagnose(input: DiagnoseInput, options: DiagnoseOptions): Promise<DiagnoseResult> {
  const slow = input.answer.includes('지연테스트')
  const waitMs = slow ? 30_000 : 1_500 + Math.random() * 1_000

  await new Promise<void>((resolve, reject) => {
    if (options.signal?.aborted) return reject(options.signal.reason)
    const timer = setTimeout(resolve, waitMs)
    options.signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(options.signal?.reason)
      },
      { once: true },
    )
  })

  if (input.answer.includes('429분')) throw new DiagnoseError('RATE_LIMIT_MINUTE')
  if (input.answer.includes('429일')) throw new DiagnoseError('RATE_LIMIT_DAY')
  if (input.answer.includes('키오류')) throw new DiagnoseError('KEY_INVALID')

  mockCallCount += 1
  const result =
    mockCallCount === 1 ? MOCK_BASE : mockCallCount === 2 ? MOCK_IMPROVED : MOCK_ALL_CLEAR
  return structuredClone(result)
}

/**
 * 실제 Google Gemini REST API 직접 호출
 */
export async function callGeminiApi(
  input: DiagnoseInput,
  options: DiagnoseOptions,
): Promise<DiagnoseResult> {
  const raw = await requestGeminiRaw(input, options)
  return validateAndSanitizeResult(raw, input.answer)
}

/** 검증 전 원본 응답을 반환 (QA 스크립트에서 환각 인용 계측용) */
export async function requestGeminiRaw(
  input: DiagnoseInput,
  options: DiagnoseOptions,
): Promise<DiagnoseResult> {
  const model = options.model || DEFAULT_MODEL
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const prompt = buildDiagnosePrompt(input)

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 1.0,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
    },
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': options.apiKey,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    })
  } catch (err: unknown) {
    if (options.signal?.aborted) {
      throw new DiagnoseError('TIMEOUT')
    }
    throw new DiagnoseError('NETWORK', err instanceof Error ? err.message : '네트워크 연결 오류')
  }

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errJson = await response.json()
      errorDetail = JSON.stringify(errJson)
    } catch {
      // ignore
    }

    if (response.status === 400 || response.status === 403) {
      throw new DiagnoseError('KEY_INVALID', 'API 키가 올바르지 않거나 권한이 없습니다.')
    }
    if (response.status === 429) {
      if (errorDetail.includes('PerDay') || errorDetail.includes('Daily')) {
        throw new DiagnoseError('RATE_LIMIT_DAY', '일일 무료 사용량을 초과했습니다.')
      }
      throw new DiagnoseError('RATE_LIMIT_MINUTE', '분당 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.')
    }
    throw new DiagnoseError('NETWORK', `API 오류 (${response.status}): ${errorDetail}`)
  }

  const data = await response.json()
  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidateText) {
    throw new DiagnoseError('NETWORK', 'AI 응답 텍스트가 비어 있습니다.')
  }

  try {
    return JSON.parse(candidateText) as DiagnoseResult
  } catch {
    throw new DiagnoseError('NETWORK', '응답 JSON 파싱 실패')
  }
}

/**
 * 진단 메인 엔트리 함수:
 * 브라우저 환경, 네트워크, 한글 비율 등을 사전 검증한 뒤
 * 키 종류에 따라 실제 Gemini API 호출 또는 Mock 동작을 수행합니다.
 */
export async function diagnose(
  input: DiagnoseInput,
  options: DiagnoseOptions,
): Promise<DiagnoseResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new DiagnoseError('NETWORK')
  }

  // 한글 비율 검사 (30% 미만 시 자기소개서 부적합 예외)
  if (hangulRatio(input.answer) < 0.3) {
    throw new DiagnoseError('NOT_COVER_LETTER')
  }

  // 개발/데모 키이거나 디버그 키워드가 포함된 경우 목업 엔진 구동
  const isDevKey = options.apiKey === DEV_KEY || options.apiKey.startsWith('demo-')
  const hasDebugKeyword =
    input.answer.includes('지연테스트') ||
    input.answer.includes('429분') ||
    input.answer.includes('429일') ||
    input.answer.includes('키오류')

  if (isDevKey || hasDebugKeyword) {
    return runMockDiagnose(input, options)
  }

  // 실제 Gemini REST API 직접 호출
  return callGeminiApi(input, options)
}
