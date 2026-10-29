export type Verdict = 'sufficient' | 'needs_work' | 'insufficient' | 'not_applicable'

export interface Criterion {
  id: number
  name: string
  verdict: Verdict
  evidence: string[]
  feedback: string
}

export interface Suggestion {
  original: string
  suggested: string
  reason: string
  criterion_id: number
}

export interface DiagnoseResult {
  question_intent: string
  criteria: Criterion[]
  suggestions: Suggestion[]
}

export interface DiagnoseInput {
  jobFamily: string
  jobTitle: string
  question: string
  answer: string
  charLimit: number
  countSpaces: boolean
}

export type DiagnoseErrorCode =
  | 'KEY_INVALID'
  | 'RATE_LIMIT_MINUTE'
  | 'RATE_LIMIT_DAY'
  | 'NOT_COVER_LETTER'
  | 'TIMEOUT'
  | 'NETWORK'
