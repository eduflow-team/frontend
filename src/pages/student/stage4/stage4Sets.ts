import type { StudentAssignmentItem } from '../../../api/types';
import { PROGRESS_LABELS } from '../../../utils/labels';

const DIFF_SUFFIX = /\s*\((EASY|NORMAL|HARD)\)\s*$/i;

/** 예전 제목의 (EASY|NORMAL|HARD) 접미사를 제거해 세트 제목으로 씁니다. */
export function stage4SetTitle(raw: string | null | undefined, fallbackId: number | string): string {
  const base = (raw ?? '').trim().replace(DIFF_SUFFIX, '').trim();
  return base || `과제 #${fallbackId}`;
}

export interface Stage4SetListItem {
  /** 목록 선택용 키 (set_id 또는 assignment_id) */
  key: string;
  setId: number | null;
  /** 세트 내 아무 assignment_id (set API / EASY 진입용) */
  entryAssignmentId: string;
  title: string;
  statusLabel: string;
  meta: string;
  memberIds: string[];
}

/** Stage4 과제를 set_id 기준으로 묶어 학생 목록용으로 변환합니다. */
export function toStage4SetList(
  items: StudentAssignmentItem[] | undefined,
): Stage4SetListItem[] {
  const stage4 = (items ?? []).filter((a) => a.stage == null || Number(a.stage) === 4);
  const groups = new Map<string, StudentAssignmentItem[]>();

  for (const item of stage4) {
    const key =
      item.set_id != null ? `set-${item.set_id}` : `solo-${item.assignment_id}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).map(([key, members]) => {
    const sorted = [...members].sort((a, b) => a.assignment_id - b.assignment_id);
    const first = sorted[0];
    const setId = first.set_id ?? null;
    const doneCount = sorted.filter((m) => m.status === 'COMPLETED').length;
    const anyInProgress = sorted.some((m) => m.status === 'IN_PROGRESS');
    let statusLabel = '시작하기';
    if (doneCount === sorted.length && sorted.length > 0) {
      statusLabel = PROGRESS_LABELS.COMPLETED;
    } else if (doneCount > 0 || anyInProgress) {
      statusLabel = PROGRESS_LABELS.IN_PROGRESS;
    } else if (first.status) {
      statusLabel = PROGRESS_LABELS[first.status] ?? '시작하기';
    }

    return {
      key,
      setId,
      entryAssignmentId: String(first.assignment_id),
      title: stage4SetTitle(first.title, first.assignment_id),
      statusLabel,
      meta: `EASY · NORMAL · HARD · ${sorted.length}개 난이도`,
      memberIds: sorted.map((m) => String(m.assignment_id)),
    };
  });
}
