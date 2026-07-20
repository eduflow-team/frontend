import type { ProgressStatus } from '../api/types';

export const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  NOT_STARTED: '시작 전',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
};

export function formatClassLabel(grade: number | null, classNumber: number | null): string {
  if (grade != null && classNumber != null) return `${grade}학년 ${classNumber}반`;
  return '반 정보 없음';
}
