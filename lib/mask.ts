import type { DiagnoseResult } from './types'

type Category = 'name' | 'school' | 'contact' | 'custom'

export interface MaskResult {
  masked: string[]
  /** token -> original word */
  map: Record<string, string>
  counts: Record<Category, number>
  hasRRN: boolean
}

const RRN_PATTERN = /\d{6}\s?-\s?\d{7}/
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE_PATTERN = /(?:\+82[-.\s]?0?\d{1,2}|0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}/g
const SCHOOL_PATTERN = /[가-힣A-Za-z]{1,20}(?:대학교|고등학교)/g
const NAME_PATTERN = /(저는|제 이름은|이름은)(\s*)([가-힣]{2,4})(?=입니다|이며|이고|라고)/g

// 축약·영문 학교명 (정식 명칭 `~대학교`는 SCHOOL_PATTERN이 먼저 처리)
const SCHOOL_ABBR = [
  '서울시립대', '서울대', '연세대', '고려대', '성균관대', '한양대', '중앙대', '경희대', '이화여대', '숙명여대',
  '서강대', '건국대', '동국대', '홍익대', '한국외대', '부산대', '경북대', '전남대', '충남대', '포항공대',
  '카이스트', '포스텍', 'KAIST', 'POSTECH', 'UNIST', 'DGIST', 'GIST',
]
  .sort((a, b) => b.length - a.length)
  .join('|')
const SCHOOL_ABBR_PATTERN = new RegExp(`(?<![가-힣A-Za-z])(?:${SCHOOL_ABBR})(?![A-Za-z]|공원|입구)`, 'g')
// 목록에 없는 `OO대`는 학적 문맥(출신·졸업 등)이 붙을 때만 학교로 본다
const SCHOOL_CONTEXT_PATTERN = /(?<![가-힣])[가-힣]{2,6}대(?=\s?(?:출신|졸업|재학|입학|학과|학부|캠퍼스|동문))/g
const SCHOOL_EN_PATTERN =
  /(?:[A-Z][A-Za-z'-]*\s){1,3}(?:University|College|Institute of Technology)\b|University of [A-Z][A-Za-z'-]*(?:\s[A-Z][A-Za-z'-]*){0,2}/g

// 본문 속 이름: 흔한 성씨 + 2글자 뒤에 직함·호칭이 붙는 경우만 (오탐 방지)
const SURNAMES = '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민나진지엄채원천방공현함변염여추도소석'
const TITLED_NAME_PATTERN = new RegExp(
  `(?<![가-힣])([${SURNAMES}][가-힣]{2})(?=\\s?(?:팀장|과장|차장|부장|대리(?!점|운전|인)|선배|후배|교수|실장|매니저|멘토|사수|씨|님))`,
  'g',
)

// 주소: 시·도 + 시/군/구 + 도로명·동·읍·면 (+ 번지·호수)
const ADDRESS_PATTERN =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별자치시|특별자치도|특별시|광역시|도|시)?\s?[가-힣]{1,6}(?:시|군|구)\s?(?:[가-힣]{1,8}(?:구|동|읍|면)\s?)?[가-힣0-9]{1,12}(?:로|길|동|읍|면)(?:\s?\d{1,4}(?:-\d{1,4})?(?:번길|길|번지|호)?){0,3}/g

export const MASK_TOKEN_PATTERN = /(\[(?:이름|학교|연락처|가림)\d*\])/

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokenFor(category: Category, index: number) {
  switch (category) {
    case 'name':
      return index === 1 ? '[이름]' : `[이름${index}]`
    case 'school':
      return `[학교${index}]`
    case 'contact':
      return index === 1 ? '[연락처]' : `[연락처${index}]`
    case 'custom':
      return `[가림${index}]`
  }
}

export function maskTexts(texts: string[], customWords: string[]): MaskResult {
  const registry: Record<Category, Map<string, string>> = {
    name: new Map(),
    school: new Map(),
    contact: new Map(),
    custom: new Map(),
  }

  const register = (category: Category, original: string) => {
    const existing = registry[category].get(original)
    if (existing) return existing
    const token = tokenFor(category, registry[category].size + 1)
    registry[category].set(original, token)
    return token
  }

  const hasRRN = texts.some((t) => RRN_PATTERN.test(t))

  const words = [...new Set(customWords.map((w) => w.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  )

  const masked = texts.map((text) => {
    let out = text
    for (const word of words) {
      out = out.replace(new RegExp(escapeRegExp(word), 'g'), (m) => register('custom', m))
    }
    out = out.replace(EMAIL_PATTERN, (m) => register('contact', m))
    out = out.replace(PHONE_PATTERN, (m) => register('contact', m))
    out = out.replace(ADDRESS_PATTERN, (m) => register('contact', m))
    out = out.replace(SCHOOL_PATTERN, (m) => register('school', m))
    out = out.replace(SCHOOL_ABBR_PATTERN, (m) => register('school', m))
    out = out.replace(SCHOOL_CONTEXT_PATTERN, (m) => register('school', m))
    out = out.replace(SCHOOL_EN_PATTERN, (m) => register('school', m.trim()))
    out = out.replace(NAME_PATTERN, (_m, lead: string, gap: string, name: string) => {
      return `${lead}${gap}${register('name', name)}`
    })
    out = out.replace(TITLED_NAME_PATTERN, (m) => register('name', m))
    return out
  })

  const map: Record<string, string> = {}
  for (const category of Object.keys(registry) as Category[]) {
    for (const [original, token] of registry[category]) map[token] = original
  }

  return {
    masked,
    map,
    hasRRN,
    counts: {
      name: registry.name.size,
      school: registry.school.size,
      contact: registry.contact.size,
      custom: registry.custom.size,
    },
  }
}

export function maskSignature(result: MaskResult, customWords: string[]) {
  const entries = Object.entries(result.map).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify({ entries, words: [...customWords].sort() })
}

export function unmask(text: string, map: Record<string, string>) {
  let out = text
  for (const [token, original] of Object.entries(map)) {
    out = out.split(token).join(original)
  }
  return out
}

export function unmaskResult(result: DiagnoseResult, map: Record<string, string>): DiagnoseResult {
  const u = (t: string) => unmask(t, map)
  return {
    question_intent: u(result.question_intent),
    criteria: result.criteria.map((c) => ({
      ...c,
      evidence: c.evidence.map(u),
      feedback: u(c.feedback),
    })),
    suggestions: result.suggestions.map((s) => ({
      ...s,
      original: u(s.original),
      suggested: u(s.suggested),
      reason: u(s.reason),
    })),
  }
}
