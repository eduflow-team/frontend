import type { ProgressStatus } from '../api/types';
import { emptyLiteracyScores, type LiteracyScores } from '../constants/literacyAxes';
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

export function emptyStudentDashboard(
  studentName = '',
  classLabel = '',
): StudentDashboardViewModel {
  return {
    studentName,
    classLabel,
    attendanceRate: 0,
    classAverage: null,
    axes: emptyLiteracyScores(),
    tasks: [],
  };
}
