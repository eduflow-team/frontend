import type { StudentAssignmentItem } from '../../api/types';
import { ApiStateBody } from '../common';
import { PROGRESS_LABELS } from '../../utils/labels';

export interface SelectableAssignment {
  id: string;
  title: string;
  statusLabel: string;
  meta?: string;
}

interface AssignmentSelectPanelProps {
  moduleName: string;
  contentDesc: string;
  loading?: boolean;
  error?: string | null;
  assignments: SelectableAssignment[];
  emptyMessage: string;
  idPlaceholder?: string;
  assignmentIdInput: string;
  onAssignmentIdInputChange: (value: string) => void;
  onSelect: (id: string) => void;
  showManualId?: boolean;
}

export function toSelectableAssignments(
  items: StudentAssignmentItem[] | undefined,
  stage: number,
): SelectableAssignment[] {
  return (items ?? [])
    .filter((a) => a.stage == null || Number(a.stage) === stage)
    .map((a) => ({
      id: String(a.assignment_id),
      title: a.title ?? `과제 #${a.assignment_id}`,
      statusLabel: a.status ? PROGRESS_LABELS[a.status] : '시작하기',
    }));
}

export function AssignmentSelectPanel({
  moduleName,
  contentDesc,
  loading = false,
  error = null,
  assignments,
  emptyMessage,
  idPlaceholder = '예: 101',
  assignmentIdInput,
  onAssignmentIdInputChange,
  onSelect,
  showManualId = true,
}: AssignmentSelectPanelProps) {
  return (
    <div className="stage-assign">
      <p className="stage-assign-eyebrow">학습 준비</p>
      <h1 className="stage-assign-title">과제 선택</h1>
      <p className="stage-assign-desc">
        {moduleName} · {contentDesc}
        <br />
        시작할 과제를 고르세요.
      </p>

      <ApiStateBody
        loading={loading}
        error={error}
        isEmpty={assignments.length === 0}
        emptyMessage={emptyMessage}
      >
        <ul className="stage-assign-list">
          {assignments.map((a) => (
            <li key={a.id}>
              <button type="button" className="stage-assign-row" onClick={() => onSelect(a.id)}>
                <span className="stage-assign-row-main">
                  <strong>{a.title}</strong>
                  {a.meta ? <span className="stage-assign-meta">{a.meta}</span> : null}
                </span>
                <span className="stage-assign-status">{a.statusLabel}</span>
                <span className="stage-assign-chevron" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ApiStateBody>

      {showManualId ? (
        <div className="stage-assign-manual">
          <label className="stage-assign-manual-label" htmlFor="stage-assignment-id">
            과제 ID로 열기
          </label>
          <div className="stage-assign-manual-row">
            <input
              id="stage-assignment-id"
              className="stage-assign-input"
              value={assignmentIdInput}
              onChange={(e) => onAssignmentIdInputChange(e.target.value)}
              placeholder={idPlaceholder}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (assignmentIdInput.trim()) onSelect(assignmentIdInput.trim());
              }}
            >
              열기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
