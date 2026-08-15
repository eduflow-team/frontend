import type { ProgressStatus } from '../api/types';
import type { LiteracyScores } from '../constants/literacyAxes';

export interface DashboardTask {
  id: number | string;
  title: string;
  subject: string;
  stage: number;
  status: ProgressStatus;
  dueLabel: string;
  dueToday?: boolean;
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
      subject: 'RAG 체험',
      stage: 1,
      status: 'COMPLETED',
      dueLabel: '8. 10.',
      remainingAttempts: 0,
      href: '/student/stage/1',
      score: 88,
    },
    {
      id: 2,
      title: '틀린 AI 답 고치기',
      subject: 'Hallucination 탐지',
      stage: 2,
      status: 'IN_PROGRESS',
      dueLabel: '8. 15.',
      remainingAttempts: 2,
      href: '/student/stage/2',
      score: 76,
    },
    {
      id: 3,
      title: 'AI와 역사 해석 토론',
      subject: 'AI 토론',
      stage: 3,
      status: 'IN_PROGRESS',
      dueLabel: '오늘',
      dueToday: true,
      remainingAttempts: 3,
      href: '/student/stage/3',
      score: 64,
    },
    {
      id: 4,
      title: '역사 자료 AI 보안 체험',
      subject: '보안 강화',
      stage: 4,
      status: 'NOT_STARTED',
      dueLabel: '8. 24.',
      remainingAttempts: 5,
      href: '/student/stage/4',
    },
  ],
};
