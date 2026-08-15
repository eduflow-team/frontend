import { useEffect, useState } from 'react';
import { ApiError, fetchStudentStep2DocumentBlobApi } from '../../api';

interface PdfViewerModalProps {
  assignmentId: string;
  filename: string;
  open: boolean;
  onClose: () => void;
}

export function PdfViewerModal({
  assignmentId,
  filename,
  open,
  onClose,
}: PdfViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    let createdUrl = '';
    setLoading(true);
    setError('');
    void fetchStudentStep2DocumentBlobApi(assignmentId)
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'PDF를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setBlobUrl('');
    };
  }, [assignmentId, open]);

  if (!open) return null;

  return (
    <div className="stage2-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="stage2-pdf-modal"
        role="dialog"
        aria-modal="true"
        aria-label="교과 PDF 원문"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="stage2-modal-header">
          <strong>{filename || '교과 PDF 원문'}</strong>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="stage2-pdf-body">
          {loading && <p>PDF 불러오는 중…</p>}
          {error && <p className="inline-alert error">{error}</p>}
          {!loading && !error && blobUrl && (
            <iframe title={filename || '교과 PDF 원문'} src={blobUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
