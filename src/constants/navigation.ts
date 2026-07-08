import type { NavSection, StudentSubject } from '../types';

export const TEACHER_NAV: NavSection[] = [
  {
    label: '메인',
    items: [{ label: '홈', path: '/teacher' }],
  },
  {
    label: '진행 현황',
    items: [
      { label: '1단계', path: '/teacher/stage/1' },
      { label: '2단계', path: '/teacher/stage/2' },
      { label: '3단계', path: '/teacher/stage/3' },
      { label: '4단계', path: '/teacher/stage/4' },
    ],
  },
  {
    label: '관리',
    items: [
      { label: '자료 관리', path: '/teacher/materials' },
      { label: '학생 현황', path: '/teacher/students', badge: 3 },
      { label: '성적 관리', path: '/teacher/grades' },
      { label: '출석 관리', path: '/teacher/attendance' },
    ],
  },
  {
    label: '소통',
    items: [
      { label: '공지사항', path: '/teacher/notices' },
      { label: '메시지', path: '/teacher/messages', badge: 2 },
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

export const STUDENT_SUBJECTS: StudentSubject[] = [
  {
    key: 'hist',
    name: '한국사',
    activities: [
      {
        id: 's-stage1',
        stage: 1,
        title: '조선 시대 장영실의 과학 기술 업적',
        path: '/student/hist/stage/1',
      },
      {
        id: 's-stage2',
        stage: 2,
        title: 'AI가 틀린 역사 답변 찾기',
        path: '/student/hist/stage/2',
      },
      {
        id: 's-stage3',
        stage: 3,
        title: 'AI와 역사 해석 토론',
        path: '/student/hist/stage/3',
      },
      {
        id: 's-stage4',
        stage: 4,
        title: '역사 자료 AI 보안 체험',
        path: '/student/hist/stage/4',
      },
    ],
  },
  {
    key: 'sci',
    name: '과학',
    activities: [
      {
        id: 's-stage1',
        stage: 1,
        title: '식물의 광합성 — AI 답변 실험',
        path: '/student/sci/stage/1',
      },
      {
        id: 's-stage2',
        stage: 2,
        title: '광합성 AI 오류 찾기',
        path: '/student/sci/stage/2',
      },
      {
        id: 's-stage3',
        stage: 3,
        title: 'AI와 과학 실험 토론',
        path: '/student/sci/stage/3',
      },
      {
        id: 's-stage4',
        stage: 4,
        title: '실험 데이터 AI 보안 체험',
        path: '/student/sci/stage/4',
      },
    ],
  },
  {
    key: 'soc',
    name: '사회',
    activities: [
      {
        id: 's-stage1',
        stage: 1,
        title: '민주주의의 발전 — AI 답변 분석',
        path: '/student/soc/stage/1',
      },
      {
        id: 's-stage2',
        stage: 2,
        title: 'AI가 틀린 사회 답변 찾기',
        path: '/student/soc/stage/2',
      },
      {
        id: 's-stage3',
        stage: 3,
        title: 'AI와 시민 교육 토론',
        path: '/student/soc/stage/3',
      },
      {
        id: 's-stage4',
        stage: 4,
        title: '선거 정보 AI 보안 체험',
        path: '/student/soc/stage/4',
      },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  '/teacher': '홈',
  '/teacher/stage/1': '1단계 · AI 학습 원리',
  '/teacher/stage/2': '2단계 · Hallucination Detective',
  '/teacher/stage/3': '3단계 과제 출제',
  '/teacher/stage/4': '4단계 과제 출제',
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
};

export const STAGE_TITLES: Record<number, string> = {
  1: 'AI는 어떻게 학습하고 답할까?',
  2: '환각 탐정 — AI 답변 사건 조사',
  3: 'AI 관점 비교 토론',
  4: 'AI 보안 실습',
};
