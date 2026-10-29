import type { DiagnoseResult } from './types'

export const JOB_FAMILIES = [
  { value: 'business', label: '경영·사무' },
  { value: 'planning', label: '기획·마케팅' },
  { value: 'it', label: 'IT·개발' },
  { value: 'design', label: '디자인' },
  { value: 'sales', label: '영업·고객관리' },
  { value: 'engineering', label: '생산·엔지니어링' },
]

export const DEMO_QUESTION =
  '문제를 해결하기 위해 주도적으로 행동했던 경험을 구체적으로 서술해 주세요.'

export const DEMO_ANSWER = `한국대학교 재학 중 2년간 동네 카페에서 아르바이트를 하며 주문 대기 문제를 해결한 경험이 있습니다. 주말 오후에는 당시 많은 손님이 와서 줄이 길었고, 주문을 기다리다 돌아가는 손님도 생겼습니다.

저는 원인을 찾기 위해 일주일 동안 주문 흐름을 관찰했고, 손님들이 메뉴판 앞에서 고민하는 시간이 길다는 점을 발견했습니다. 그래서 사장님께 대기 줄에서 미리 볼 수 있는 인기 메뉴 안내판과 사전 주문 메모지를 제안했습니다. 처음에는 직원들이 번거로워했지만, 제가 직접 메모지 양식을 만들고 사용법을 정리해 공유하면서 점차 정착되었습니다. 그 결과 반응이 좋았습니다.

이 경험을 통해 불편을 겪는 사람의 행동을 관찰하는 것이 해결의 출발점이라는 것을 배웠습니다. 서비스기획 직무에서도 사용자의 불편을 직접 관찰하고 작은 개선부터 실행하겠습니다.`

export const DEMO_PII_ANSWER = `저는 김하늘입니다. ${DEMO_ANSWER}
연락처는 010-1234-5678, sky.kim@example.com 입니다.`

export const DEMO_JOB = { jobFamily: 'planning', jobTitle: '서비스기획' }

export const MOCK_BASE: DiagnoseResult = {
  question_intent:
    '이 문항은 결과보다 문제를 해결한 과정과 그 과정에서의 본인 역할을 봅니다.',
  criteria: [
    {
      id: 1,
      name: '문항 적합도',
      verdict: 'sufficient',
      evidence: [],
      feedback: '문항이 묻는 문제 해결 경험에 직접 답했습니다.',
    },
    {
      id: 2,
      name: '두괄식 구조',
      verdict: 'needs_work',
      evidence: ['당시 많은 손님이 와서 줄이 길었고'],
      feedback: '결론이 두 번째 문장에 있습니다. 첫 문장으로 옮기세요.',
    },
    {
      id: 3,
      name: '경험의 구체성',
      verdict: 'insufficient',
      evidence: ['당시 많은 손님이 와서 줄이 길었고'],
      feedback: "'많은'을 인원이나 시간 같은 수치로 바꿔보세요.",
    },
    {
      id: 4,
      name: '직무 연결성',
      verdict: 'insufficient',
      evidence: ['그 결과 반응이 좋았습니다.'],
      feedback: '서비스기획이라면 고객 반응을 어떻게 확인했는지가 핵심입니다.',
    },
    {
      id: 5,
      name: '회사·산업 이해도',
      verdict: 'not_applicable',
      evidence: [],
      feedback: '이 문항은 지원동기를 묻지 않아 판정에서 제외했습니다.',
    },
  ],
  suggestions: [
    {
      original: '당시 많은 손님이 와서 줄이 길었고',
      suggested: '[구체적 수치]명이 한꺼번에 몰려 대기가 [수치]분까지 늘어났고',
      reason: '규모가 보여야 문제의 크기가 보입니다.',
      criterion_id: 3,
    },
    {
      original: '그 결과 반응이 좋았습니다.',
      suggested:
        '그 결과 평균 대기 시간을 [수치]분 줄였고, 현장 설문에서 [수치]%가 만족했습니다.',
      reason: '성과를 측정한 방식이 기획 역량을 보여줍니다.',
      criterion_id: 4,
    },
  ],
}

export const MOCK_IMPROVED: DiagnoseResult = {
  ...MOCK_BASE,
  criteria: MOCK_BASE.criteria.map((c) => {
    if (c.id === 3)
      return {
        ...c,
        verdict: 'needs_work',
        feedback: '대기 시간은 드러났지만, 몰린 손님 규모가 아직 빠져 있어요.',
      }
    if (c.id === 4)
      return {
        ...c,
        verdict: 'sufficient',
        evidence: [],
        feedback: '성과를 측정한 방식이 드러나 기획 역량과 잘 이어집니다.',
      }
    return c
  }),
  suggestions: [
    {
      original: '당시 많은 손님이 와서 줄이 길었고',
      suggested: '주말 오후마다 [구체적 수치]명이 몰려 대기가 늘어났고',
      reason: '인원까지 보이면 문제의 크기가 확실해집니다.',
      criterion_id: 3,
    },
    {
      original: '한국대학교 재학 중 2년간 동네 카페에서 아르바이트를 하며',
      suggested: '주문 대기 시간을 [수치]분 줄인 경험이 있습니다. 카페 아르바이트 당시',
      reason: '첫 문장에서 성과를 먼저 말하면 읽는 사람이 바로 핵심을 잡습니다.',
      criterion_id: 2,
    },
  ],
}

export const MOCK_ALL_CLEAR: DiagnoseResult = {
  ...MOCK_BASE,
  criteria: MOCK_BASE.criteria.map((c) =>
    c.verdict === 'not_applicable'
      ? c
      : { ...c, verdict: 'sufficient', evidence: [], feedback: '기준을 충분히 충족했습니다.' },
  ),
  suggestions: [],
}
