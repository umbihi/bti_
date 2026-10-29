import type { Criterion, DiagnoseResult, Verdict } from './types'

export const SNAPSHOT_SEP = '\u0000'

export function countChars(text: string, countSpaces: boolean) {
  return countSpaces ? text.length : text.replace(/\s/g, '').length
}

export const VERDICT_META: Record<
  Verdict,
  { label: string; level: number; ink: string; fill: string; soft: string; border: string }
> = {
  sufficient: {
    label: '충분',
    level: 3,
    ink: 'text-good-ink',
    fill: 'bg-good',
    soft: 'bg-good-soft',
    border: 'border-good/40',
  },
  needs_work: {
    label: '보완',
    level: 2,
    ink: 'text-warn-ink',
    fill: 'bg-warn',
    soft: 'bg-warn-soft',
    border: 'border-warn/40',
  },
  insufficient: {
    label: '부족',
    level: 1,
    ink: 'text-bad-ink',
    fill: 'bg-bad',
    soft: 'bg-bad-soft',
    border: 'border-bad/40',
  },
  not_applicable: {
    label: '해당 없음',
    level: 0,
    ink: 'text-na-ink',
    fill: 'bg-transparent',
    soft: 'bg-na-soft',
    border: 'border-na/60',
  },
}

export const CIRCLED = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨']

export function clearStats(criteria: Criterion[]) {
  const applicable = criteria.filter((c) => c.verdict !== 'not_applicable')
  const cleared = applicable.filter((c) => c.verdict === 'sufficient')
  return { cleared: cleared.length, total: applicable.length }
}

export function isAllClear(result: DiagnoseResult) {
  const { cleared, total } = clearStats(result.criteria)
  return total > 0 && cleared === total
}

export interface CriterionChange {
  id: number
  name: string
  from: Verdict
  to: Verdict
  delta: number
}

export function compareResults(prev: DiagnoseResult, next: DiagnoseResult): CriterionChange[] {
  return next.criteria.map((c) => {
    const before = prev.criteria.find((p) => p.id === c.id)
    const from = before?.verdict ?? c.verdict
    const comparable = from !== 'not_applicable' && c.verdict !== 'not_applicable'
    return {
      id: c.id,
      name: c.name,
      from,
      to: c.verdict,
      delta: comparable ? VERDICT_META[c.verdict].level - VERDICT_META[from].level : 0,
    }
  })
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export function currentWeek(today = new Date()) {
  const mondayOffset = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  const todayKey = dateKey(today)
  return WEEKDAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const key = dateKey(d)
    return { key, label, date: d.getDate(), isToday: key === todayKey }
  })
}

export function streakCount(stamps: string[], today = new Date()) {
  const set = new Set(stamps)
  const cursor = new Date(today)
  if (!set.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (set.has(dateKey(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}
