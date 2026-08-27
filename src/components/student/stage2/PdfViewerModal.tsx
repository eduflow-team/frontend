import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchStudentStep2DocumentBlobApi } from '../../../api';

type PdfViewerModalProps = {
  assignmentId: number | string;
  filename: string;
  open: boolean;
  onClose: () => void;
  /** demo 등 PDF API 없이 발췌문만 보여줄 때 */
  fallbackText?: string;
  /** PDF 로드 실패 시 발췌문 대체 */
  excerptFallback?: string;
};

export function PdfViewerModal({
  assignmentId,
  filename,
  open,
  onClose,
  fallbackText,
  excerptFallback,
}: PdfViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cleanup = useCallback(() => {
    setBlobUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return '';
    });
  }, []);

  useEffect(() => {
    if (!open) {
      cleanup();
      setError('');
      setLoading(false);
      return undefined;
    }

    if (fallbackText) {
      cleanup();
      setError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    cleanup();

    void fetchStudentStep2DocumentBlobApi(assignmentId)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch((err) => {
        if (cancelled) return;
        if (excerptFallback?.trim()) {
          setError('');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'PDF를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [assignmentId, cleanup, excerptFallback, fallbackText, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="pdf-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pdf-modal"
        role="dialog"
        aria-modal="true"
        aria-label="교과 PDF 원문"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pdf-modal-header">
          <strong>{filename || '교과 PDF 원문'}</strong>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="pdf-modal-body">
          {fallbackText ? (
            <div className="pdf-modal-placeholder">
              <p style={{ whiteSpace: 'pre-wrap', textAlign: 'left', width: '100%' }}>{fallbackText}</p>
            </div>
          ) : loading ? (
            <p className="pdf-modal-state">PDF 불러오는 중…</p>
          ) : error ? (
            <p className="pdf-modal-state error">{error}</p>
          ) : blobUrl ? (
            <iframe title={filename || '교과 PDF 원문'} src={blobUrl} className="pdf-frame" />
          ) : excerptFallback?.trim() ? (
            <div className="pdf-modal-placeholder">
              <p className="pdf-modal-state" style={{ marginBottom: 12 }}>
                PDF를 불러오지 못해 발췌문을 표시합니다.
              </p>
              <p style={{ whiteSpace: 'pre-wrap', textAlign: 'left', width: '100%' }}>{excerptFallback}</p>
            </div>
          ) : (
            <p className="pdf-modal-state">원문을 불러올 수 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
