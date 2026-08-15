interface CorrectionConfirmModalProps {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CorrectionConfirmModal({
  open,
  submitting,
  onCancel,
  onConfirm,
}: CorrectionConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="stage2-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="stage2-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="교정 최종 제출 확인"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>교정을 최종 제출할까요?</h3>
        <p>제출 후에는 수정할 수 없습니다.</p>
        <div className="stage2-modal-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={submitting}
            onClick={onConfirm}
          >
            {submitting ? '제출 중…' : '최종 제출'}
          </button>
        </div>
      </div>
    </div>
  );
}
