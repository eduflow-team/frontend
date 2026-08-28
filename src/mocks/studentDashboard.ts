import type { ProgressStatus } from '../api/types';
import type { LiteracyScores } from '../constants/literacyAxes';
import type { SubjectValue } from '../constants/assignments';

export interface DashboardTask {
  id: number | string;
  title: string;
  subjectKey: SubjectValue;
  subjectLabel: string;
  stage: number;
  status: ProgressStatus;
  dueAt?: string | null;
  dueLabel: string;
  dueToday?: boolean;
  dueSoon?: boolean;
  remainingAttempts?: number | null;
  href: string;
  score?: number | null;
}

export interface StudentDashboardViewModel {
  studentName: string;
  classLabel: string;
  attendanceRate: number;
  classAverage: number | null;
  axes: LiteracyScores;
  tasks: DashboardTask[];
}

/** stage1_ui 데모 샘플 — 데모 로그인용 */
export const STUDENT_DASHBOARD_DEMO: StudentDashboardViewModel = {
  studentName: '이지은',
  classLabel: '3학년 2반',
  attendanceRate: 95,
  classAverage: 68,
  axes: {
    ai_operation: 88,
    hallucination: 76,
    ai_response: 64,
    critical: 58,
    collaboration: null,
    ethics: null,
  },
  tasks: [
    {
      id: 1,
      title: '자료 맞는 AI 답 찾기',
      subjectKey: 'hist',
      subjectLabel: '한국사',
      stage: 1,
      status: 'COMPLETED',
      dueLabel: '8. 10.',
      remainingAttempts: 0,
      href: '/student/hist/stage/1',
      score: 88,
    },
    {
      id: 2,
      title: '틀린 AI 답 고치기',
      subjectKey: 'hist',
      subjectLabel: '한국사',
      stage: 2,
      status: 'IN_PROGRESS',
      dueLabel: '8. 15.',
      remainingAttempts: 2,
      href: '/student/hist/stage/2',
      score: 76,
    },
    {
      id: 3,
      title: 'AI와 역사 해석 토론',
      subjectKey: 'hist',
      subjectLabel: '한국사',
      stage: 3,
      status: 'IN_PROGRESS',
      dueLabel: '오늘',
      dueToday: true,
      remainingAttempts: 3,
      href: '/student/hist/stage/3',
      score: 64,
    },
    {
      id: 4,
      title: '광합성 개념 탐색',
      subjectKey: 'sci',
      subjectLabel: '과학',
      stage: 1,
      status: 'NOT_STARTED',
      dueLabel: '8. 20.',
      remainingAttempts: 5,
      href: '/student/sci/stage/1',
    },
    {
      id: 5,
      title: '역사 자료 AI 보안 체험',
      subjectKey: 'soc',
      subjectLabel: '사회',
      stage: 4,
      status: 'NOT_STARTED',
      dueLabel: '8. 24.',
      remainingAttempts: 5,
      href: '/student/soc/stage/4',
    },
  ],
};
