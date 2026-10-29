import {
  CalendarCheck,
  KeyRound,
  ListChecks,
  ScanSearch,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export type AchievementId =
  | 'equip'
  | 'first_diagnosis'
  | 'first_levelup'
  | 'quest_master'
  | 'all_clear'
  | 'season_runner'

export const ACHIEVEMENTS: { id: AchievementId; title: string; desc: string; icon: LucideIcon }[] = [
  { id: 'equip', title: '장비 장착', desc: '무료 AI 키를 연결했어요', icon: KeyRound },
  { id: 'first_diagnosis', title: '첫 진단', desc: '처음으로 자소서를 진단했어요', icon: ScanSearch },
  { id: 'first_levelup', title: '첫 레벨업', desc: '재진단에서 판정이 올랐어요', icon: TrendingUp },
  { id: 'quest_master', title: '퀘스트 마스터', desc: '수정 퀘스트 3개를 완료했어요', icon: ListChecks },
  { id: 'all_clear', title: 'ALL CLEAR', desc: '모든 항목을 충분으로 만들었어요', icon: Trophy },
  { id: 'season_runner', title: '시즌 러너', desc: '서로 다른 3일에 진단했어요', icon: CalendarCheck },
]

export function achievementTitle(id: AchievementId) {
  return ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id
}
