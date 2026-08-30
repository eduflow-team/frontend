import type { LearningMode, NavSection, StudentSubject } from '../types';

export const TEACHER_NAV: NavSection[] = [
  {
    label: '메인',
    items: [{ label: '홈', path: '/teacher' }],
  },
  {
    label: '과제 출제',
    items: [
      { label: 'RAG 체험', path: '/teacher/stage/1' },
      { label: 'Hallucination 탐지', path: '/teacher/stage/2' },
      { label: 'AI 토론', path: '/teacher/stage/3' },
      { label: '보안 강화', path: '/teacher/stage/4' },
    ],
  },
  {
    label: '학급',
    items: [
      { label: '학생 현황', path: '/teacher/students' },
      { label: '공지사항', path: '/teacher/notices' },
    ],
  },
];

export const TEACHER_SUBJECTS = [
  { key: 'hist' as const, name: '한국사' },
  { key: 'sci' as const, name: '과학' },
  { key: 'soc' as const, name: '사회' },
];

export const TEACHER_CLASSES = [
  { id: 'all', label: '전체 학급', count: '84명' },
  { id: '3-1', label: '3학년 1반', count: '28명' },
  { id: '3-2', label: '3학년 2반', count: '28명' },
  { id: '3-3', label: '3학년 3반', count: '28명' },
];

export const STUDENT_NAV: NavSection[] = [
  {
    label: '메인',
    items: [{ label: '홈', path: '/student' }],
  },
  {
    label: '기록',
    items: [
      { label: '점수', path: '/student/results' },
      { label: '출석', path: '/student/attendance' },
      { label: '공지사항', path: '/student/notices' },
    ],
  },
];

/** 학생 학습 모드 (사이드바·홈 카드) */
export const STUDENT_LEARNING_MODES: LearningMode[] = [
  {
    stage: 1,
    module: 'RAG 체험',
    content: '서술형 탐험 · RAG 파라미터 체험',
    tag: '탐색',
    path: '/student/stage/1',
    icon: '◇',
  },
  {
    stage: 2,
    module: 'Hallucination 탐지',
    content: 'AI 환각 탐지 및 Fact-check',
    tag: '검증',
    path: '/student/stage/2',
    icon: '◎',
  },
  {
    stage: 3,
    module: 'AI 토론',
    content: 'Multi-Agent 토론 및 비판적 사고',
    tag: '판단',
    path: '/student/stage/3',
    icon: '⬡',
  },
  {
    stage: 4,
    module: '보안 강화',
    content: '프롬프트 인젝션 방어',
    tag: '윤리',
    path: '/student/stage/4',
    icon: '▣',
  },
];

/** 기존 과목 경로 호환 — 학습모드로 연결 */
export const STUDENT_SUBJECTS: StudentSubject[] = [
  {
    key: 'hist',
    name: '학습',
    activities: STUDENT_LEARNING_MODES.map((m) => ({
      id: `s-stage${m.stage}`,
      stage: m.stage,
      title: m.module,
      path: m.path,
    })),
  },
];

export const PAGE_TITLES: Record<string, string> = {
  '/teacher': '홈',
  '/teacher/stage/1': 'RAG 체험',
  '/teacher/stage/2': 'Hallucination 탐지',
  '/teacher/stage/3': 'AI 토론',
  '/teacher/stage/4': '보안 강화',
  '/teacher/materials': '자료 관리',
  '/teacher/students': '학생 현황',
  '/teacher/grades': '성적 관리',
  '/teacher/attendance': '출석 관리',
  '/teacher/notices': '공지사항',
  '/teacher/messages': '메시지함',
  '/student': '홈',
  '/student/results': '점수',
  '/student/attendance': '출석',
  '/student/notices': '공지사항',
  '/student/stage/1': 'RAG 체험',
  '/student/stage/2': 'Hallucination 탐지',
  '/student/stage/3': 'AI 토론',
  '/student/stage/4': '보안 강화',
};

export const STAGE_TITLES: Record<number, string> = {
  1: '서술형 탐험 · RAG 파라미터 체험',
  2: 'AI 환각 탐지 및 Fact-check',
  3: 'Multi-Agent 토론 및 비판적 사고',
  4: '프롬프트 인젝션 방어',
};

export function learningModeByStage(stage: number) {
  return STUDENT_LEARNING_MODES.find((m) => m.stage === stage);
}

/** 사용자 노출용 학습모드명 (없으면 숫자 단계로 폴백) */
export function learningModeLabel(stage: number) {
  return learningModeByStage(stage)?.module ?? `${stage}단계`;
}

export function learningModeLabels(stages: number[]) {
  return stages.map(learningModeLabel).join(', ');
}
