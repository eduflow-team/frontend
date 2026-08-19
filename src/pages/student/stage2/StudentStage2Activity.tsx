import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  getStudentStep2Api,
  postStudentStep2CorrectionApi,
  postStudentStep2HighlightApi,
} from '../../../api';
import type {
  HallucinationType,
  Stage2AssignmentDetailResponse,
  Step2CorrectionResponse,
  Step2HighlightResponse,
} from '../../../api/types';
import { PdfViewerModal } from '../../../components/student/stage2/PdfViewerModal';
import { modeBadge, verifyIntro, type VerifyPhase } from '../../../mocks/verifyPrototype';
import { STAGE2_DEMO, STAGE2_HALLUC_OPTIONS, getStage2ErrorMarks } from '../../../mocks/stage2Demo';

type Rubric = { evidence: string; errorId: string; rewrite: string };

const HALLUCINATION_LABELS: Record<string, string> = {
  PERSONA_BIAS: '페르소나 편향',
  INFORMATION_FABRICATION: '정보 날조',
  RETRIEVAL_ERROR: '잘못된 문서 검색',
};

export const STAGE2_DEMO_ASSIGNMENT_ID = 'demo';

function buildDemoStage2Detail(): Stage2AssignmentDetailResponse {
  const marks = getStage2ErrorMarks();
  const flawed = STAGE2_DEMO.flawedParts.map((p) => p.text).join('');
  return {
    assignment_id: 0,
    title: STAGE2_DEMO.title,
    reference_document_filename: 'stage2-demo.pdf',
    reference_document_url: '',
    reference_document_text: STAGE2_DEMO.referenceDoc,
    question: STAGE2_DEMO.question,
    flawed_ai_response: flawed,
    due_at: null,
    expected_error_count: STAGE2_DEMO.expectedErrorCount,
    hallucination_type_options: STAGE2_HALLUC_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      description: o.description,
    })),
    hallucination_type_hints: marks.map((m) => m.correctType),
    status: 'IN_PROGRESS',
    highlight_phase_complete: false,
    remaining_errors_to_find: STAGE2_DEMO.expectedErrorCount,
    attempts: {
      max_attempts: STAGE2_DEMO.maxAttempts,
      used_attempts: 0,
      remaining_attempts: STAGE2_DEMO.maxAttempts,
    },
    cleared_highlights: [],
  };
}

function RubricDot({ mark }: { mark: string }) {
  if (mark === '✓') return <span className="rubric-dot rubric-dot-full" aria-label="완료" />;
  if (mark === '△') return <span className="rubric-dot rubric-dot-half" aria-label="부분 완료" />;
  return <span className="rubric-dot rubric-dot-empty" aria-label="미완료" />;
}

function AttemptGauge({ used, max, blocked }: { used: number; max: number; blocked: boolean }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const ring = blocked ? '#0d0d0d' : '#6e6e80';
  return (
    <div
      className="attempt-gauge"
      style={{ background: `conic-gradient(${ring} 0% ${pct}%, var(--border) ${pct}% 100%)` }}
      aria-label={`시도 ${used}/${max}`}
    >
      <div className="attempt-gauge-inner">
        {used}/{max}
      </div>
    </div>
  );
}

function getSelectionTextWithin(container: HTMLElement | null) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !container) return '';
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return '';
  return selection.toString().trim();
}

function buildAiResponseParts(flawedAiResponse: string, clearedHighlights: string[]) {
  if (!flawedAiResponse) return [{ type: 'text' as const, value: '' }];
  const cleared = [...clearedHighlights].filter(Boolean).sort((a, b) => b.length - a.length);
  if (cleared.length === 0) return [{ type: 'text' as const, value: flawedAiResponse }];

  const parts: { type: 'text' | 'cleared'; value: string }[] = [];
  let cursor = 0;
  const text = flawedAiResponse;

  while (cursor < text.length) {
    let nearest: string | null = null;
    let nearestIndex = text.length;
    for (const span of cleared) {
      const idx = text.indexOf(span, cursor);
      if (idx !== -1 && idx < nearestIndex) {
        nearest = span;
        nearestIndex = idx;
      }
    }
    if (!nearest) {
      parts.push({ type: 'text', value: text.slice(cursor) });
      break;
    }
    if (nearestIndex > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, nearestIndex) });
    }
    parts.push({ type: 'cleared', value: nearest });
    cursor = nearestIndex + nearest.length;
  }
  return parts;
}

function buildRubricFromHighlightResult(
  result: Step2HighlightResponse['results'][number] | null | undefined,
): Rubric {
  if (!result) return { evidence: '—', errorId: '—', rewrite: '—' };
  const report = result.evaluation_report ?? {};
  const evidence =
    report.reasoning_score != null
      ? report.reasoning_score >= 0.7
        ? '✓'
        : '△'
      : '—';
  const errorId = report.error_type_match ? '✓' : result.is_correct ? '✓' : '△';
  return { evidence, errorId, rewrite: '—' };
}

function formatTitle(title: string | undefined) {
  return (title || 'Hallucination 탐지').trim().replace(/^\d+단계:\s*/, '');
}

export function StudentStage2Activity({ assignmentId }: { assignmentId: string }) {
  const aiRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<Stage2AssignmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [phase, setPhase] = useState<VerifyPhase>('find');
  const [selectedText, setSelectedText] = useState('');
  const [errorType, setErrorType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [lastResult, setLastResult] = useState<Step2HighlightResponse['results'][number] | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [correctionAnswers, setCorrectionAnswers] = useState<Record<string, string>>({});
  const [correctionResult, setCorrectionResult] = useState<Step2CorrectionResponse | null>(null);
  const [rubric, setRubric] = useState<Rubric>({ evidence: '—', errorId: '—', rewrite: '—' });
  const [docOpen, setDocOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (assignmentId === STAGE2_DEMO_ASSIGNMENT_ID) {
        const data = buildDemoStage2Detail();
        setDetail(data);
        setPhase('find');
        const hints = data.hallucination_type_hints ?? [];
        if (hints[0]) setErrorType(hints[0]);
        return;
      }
      const data = await getStudentStep2Api(assignmentId);
      setDetail(data);
      if (data.status === 'COMPLETED') {
        setPhase('done');
      } else if (data.highlight_phase_complete) {
        setPhase('correct');
      } else {
        setPhase('find');
      }
      const hints = data.hallucination_type_hints ?? [];
      const options = data.hallucination_type_options ?? [];
      if (hints.length > 0) {
        setErrorType(hints[0]);
      } else if (options[0]?.value) {
        setErrorType(String(options[0].value));
      }
      if (data.cleared_highlights?.length) {
        setCorrectionAnswers((prev) => {
          const next = { ...prev };
          for (const h of data.cleared_highlights) {
            if (next[h] == null) next[h] = '';
          }
          return next;
        });
      }
    } catch (err) {
      setDetail(null);
      setLoadError(err instanceof ApiError ? err.message : '과제를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const hintSet = useMemo(
    () => new Set(detail?.hallucination_type_hints ?? []),
    [detail?.hallucination_type_hints],
  );

  const typeOptions = useMemo(() => {
    const all = detail?.hallucination_type_options ?? [];
    if (hintSet.size === 0) return all;
    const filtered = all.filter((opt) => hintSet.has(String(opt.value)));
    return filtered.length > 0 ? filtered : all;
  }, [detail?.hallucination_type_options, hintSet]);

  const selectedOption = typeOptions.find((o) => String(o.value) === errorType);
  const highlightDone = Boolean(detail?.highlight_phase_complete);
  const attemptsBlocked = detail?.attempts?.remaining_attempts === 0;
  const showFindForm = phase === 'find' && !highlightDone && !attemptsBlocked;
  const showFeedback = Boolean(lastResult) && phase === 'find' && !attemptsBlocked;

  const applyHighlightResponse = (res: Step2HighlightResponse) => {
    const result = res.results?.[0] ?? null;
    setLastResult(result);
    setRubric((prev) => ({
      ...buildRubricFromHighlightResult(result),
      rewrite: prev.rewrite,
    }));
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            highlight_phase_complete: res.highlight_phase_complete,
            remaining_errors_to_find: res.remaining_errors_to_find,
            cleared_highlights: res.cleared_highlights,
            attempts: {
              ...prev.attempts,
              used_attempts: res.attempts.used_attempts,
              remaining_attempts: res.attempts.remaining_attempts,
            },
          }
        : prev,
    );
    if (res.highlight_phase_complete) {
      setCorrectionAnswers((prev) => {
        const next = { ...prev };
        for (const h of res.cleared_highlights) {
          if (next[h] == null) next[h] = '';
        }
        return next;
      });
    }
    window.getSelection()?.removeAllRanges();
  };

  const submitFind = async () => {
    if (!detail || attemptsBlocked) return;
    if (!selectedText.trim()) {
      setFormError('지문에서 틀린 부분을 드래그해 선택해 주세요.');
      return;
    }
    if (!errorType) {
      setFormError('환각 유형을 선택해 주세요.');
      return;
    }
    if (!reason.trim()) {
      setFormError('하이라이트한 이유를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await postStudentStep2HighlightApi(assignmentId, {
        submissions: [
          {
            highlighted_text: selectedText.trim(),
            student_error_type: errorType as HallucinationType,
            student_reason: reason.trim(),
          },
        ],
      });
      applyHighlightResponse(res);
      if (res.results?.[0]?.is_correct) {
        setSelectedText('');
        setReason('');
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCorrection = async () => {
    const highlights = detail?.cleared_highlights ?? [];
    if (!highlights.length) return;
    if (highlights.some((h) => !correctionAnswers[h]?.trim())) {
      setFormError('모든 수정 문장을 입력해 주세요.');
      setConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await postStudentStep2CorrectionApi(assignmentId, {
        corrections: highlights.map((h) => ({
          original_highlight: h,
          student_answer: correctionAnswers[h].trim(),
        })),
      });
      setCorrectionResult(res);
      setRubric((prev) => ({
        ...prev,
        rewrite: res.is_passed ? '✓' : res.score >= 50 ? '△' : '—',
      }));
      setPhase('done');
      setConfirmOpen(false);
      await loadDetail();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '교정 제출에 실패했습니다.');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const onSelectMouseUp = () => {
    if (!showFindForm) return;
    const text = getSelectionTextWithin(aiRef.current);
    if (text) setSelectedText(text);
  };

  if (loading) {
    return (
      <div className="s2">
        <div className="main-area">
          <div className="container practice-wrap">
            <p className="work-intro-muted">과제를 불러오는 중…</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="s2">
        <div className="main-area">
          <div className="container practice-wrap">
            <p className="form-error">{loadError || '과제 정보가 없습니다.'}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadDetail()}>
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title = formatTitle(detail.title);
  const report = lastResult?.evaluation_report;
  const locPct =
    report?.location_match_score != null ? Math.round(report.location_match_score * 100) : null;
  const reasonPct =
    report?.reasoning_score != null ? Math.round(report.reasoning_score * 100) : null;
  const parts = buildAiResponseParts(detail.flawed_ai_response, detail.cleared_highlights);
  const maxAttempts = detail.attempts.max_attempts ?? 5;
  const usedAttempts = detail.attempts.used_attempts ?? 0;
  const canOpenPdf = Boolean(
    assignmentId &&
      (detail.reference_document_url ||
        detail.reference_document_filename ||
        detail.reference_document_text),
  );
  const pdfFilename = detail.reference_document_filename || '교과 자료.pdf';
  const hintText =
    (detail.hallucination_type_hints?.length ?? 0) > 0
      ? detail.hallucination_type_hints
          .map((h) => HALLUCINATION_LABELS[h] ?? typeOptions.find((o) => String(o.value) === h)?.label ?? h)
          .join(' · ')
      : null;

  return (
    <div className="s2">
      <div className="main-area">
        <div className="container practice-wrap">
          <div className="verify-set-bar">
            <span>
              <strong>{title}</strong>
              {detail.expected_error_count === 1 && (
                <>
                  {' '}
                  · <span className="verify-set-meta">이 카드 = 환각 1개</span>
                </>
              )}
            </span>
            <span className="verify-set-meta">과제 #{detail.assignment_id}</span>
          </div>

          <div className="practice-layout">
            <aside className="side-panel">
              <div className="side-block side-block-excerpt">
                <h4>교과 자료 · 발췌</h4>
                <p className="doc-caption">
                  질문과 관련된 발췌문입니다. 전체 교과 내용은 PDF에서 확인하세요.
                </p>
                <div className="doc-text">{detail.reference_document_text || '—'}</div>
                {hintText && <p className="doc-hint">힌트: {hintText}</p>}
                {canOpenPdf && (
                  <button type="button" className="btn btn-sm pdf-open-btn" onClick={() => setDocOpen(true)}>
                    PDF 원문 보기
                  </button>
                )}
              </div>
              <div className="side-block side-block-rubric">
                <h4>루브릭</h4>
                <div className="rubric-list">
                  <div className="rubric-item">
                    <span>근거 인용</span>
                    <RubricDot mark={rubric.evidence} />
                  </div>
                  <div className="rubric-item">
                    <span>오류 식별</span>
                    <RubricDot mark={rubric.errorId} />
                  </div>
                  <div className="rubric-item rubric-item-last">
                    <span>재서술</span>
                    <RubricDot mark={rubric.rewrite} />
                  </div>
                </div>
                <div className="verify-meta">
                  <div className="verify-meta-row">
                    <span>남은 오류</span>
                    <span className={`remaining-dot${highlightDone ? ' done' : ''}`} />
                  </div>
                  <div className="verify-meta-row">
                    <span>시도</span>
                    <AttemptGauge
                      used={usedAttempts}
                      max={maxAttempts}
                      blocked={Boolean(attemptsBlocked)}
                    />
                  </div>
                  {!highlightDone && detail.remaining_errors_to_find > 0 && (
                    <p className="verify-meta-note">남은 오류 {detail.remaining_errors_to_find}개</p>
                  )}
                </div>
              </div>
            </aside>

            <div className="work-panel">
              <div className="work-header">
                <strong>{title}</strong>
                <span className="turn-badge">{modeBadge(phase)}</span>
              </div>

              <div className="work-scroll">
                <div className="work-body">
                  <p className="work-intro-muted">{verifyIntro(phase)}</p>

                  {phase !== 'correct' && (
                    <>
                      {phase === 'find' && (
                        <p className="stage2-legend">
                          지문에서 틀린 부분을 <strong>드래그해 선택</strong>하세요.
                          {detail.remaining_errors_to_find > 0 && (
                            <> (남은 오류 {detail.remaining_errors_to_find}개)</>
                          )}
                        </p>
                      )}
                      <div className="ai-response-wrap">
                        <div
                          ref={aiRef}
                          className={`ai-block-v2${showFindForm ? ' ai-block-selectable' : ''}`}
                          onMouseUp={onSelectMouseUp}
                          role={showFindForm ? 'textbox' : undefined}
                          aria-label="AI 답변"
                        >
                          <div className="ai-response-text">
                            {parts.map((part, index) =>
                              part.type === 'cleared' ? (
                                <mark key={index} className="highlight-cleared" title="찾은 오류">
                                  {part.value}
                                </mark>
                              ) : (
                                <span key={index}>{part.value}</span>
                              ),
                            )}
                          </div>
                        </div>
                        {showFindForm && selectedText && (
                          <div className="selected-segment-box">
                            <strong>선택한 구간</strong>
                            <span>{selectedText}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {showFeedback && lastResult && (
                    <div className={`feedback-panel${lastResult.is_correct ? ' success' : ' error'}`}>
                      <strong>{lastResult.is_correct ? '맞았습니다' : '다시 시도'}</strong>
                      <p>{report?.ai_feedback || '피드백을 확인해 주세요.'}</p>
                      {report && (
                        <div className="feedback-chips">
                          {locPct != null && <span>위치 {locPct}%</span>}
                          {reasonPct != null && <span>근거 {reasonPct}%</span>}
                          <span>유형 {report.error_type_match ? '✓' : '✗'}</span>
                        </div>
                      )}
                      {lastResult.is_correct && highlightDone && (
                        <div className="input-actions feedback-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-pill btn-sm"
                            onClick={() => setPhase('correct')}
                          >
                            교정 단계로 이동
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {attemptsBlocked && phase === 'find' && !highlightDone && (
                    <div className="feedback-panel blocked">
                      <strong>시도 횟수를 모두 사용했습니다</strong>
                      <p>
                        {lastResult?.evaluation_report?.ai_feedback ||
                          '환각 구간을 찾지 못했습니다. 교사에게 도움을 요청해 보세요.'}
                      </p>
                    </div>
                  )}

                  {attemptsBlocked && phase === 'find' && highlightDone && (
                    <div className="feedback-panel blocked">
                      <strong>시도 횟수를 모두 사용했습니다</strong>
                      <p>환각 구간은 찾았습니다. 교정 단계로 이동해 마무리해 주세요.</p>
                      <div className="input-actions feedback-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-pill btn-sm"
                          onClick={() => setPhase('correct')}
                        >
                          교정 단계로 이동
                        </button>
                      </div>
                    </div>
                  )}

                  {phase === 'done' && correctionResult && (
                    <div className={`feedback-panel${correctionResult.is_passed ? ' success' : ''}`}>
                      <strong>
                        교정 결과 · {correctionResult.score}점
                        {correctionResult.is_passed ? ' · 통과' : ''}
                      </strong>
                      <p>
                        {correctionResult.feedback_details?.[0]?.ai_feedback ||
                          correctionResult.final_correct_sentence}
                      </p>
                    </div>
                  )}

                  {phase === 'done' && !correctionResult && detail.status === 'COMPLETED' && (
                    <div className="feedback-panel success">
                      <strong>이 카드는 완료되었습니다</strong>
                      <p>이미 제출된 과제입니다.</p>
                    </div>
                  )}
                </div>

                {showFindForm && (
                  <div className="find-form">
                    <div className="find-form-grid">
                      <div>
                        <label htmlFor="s2-error-type">환각 유형</label>
                        <select
                          id="s2-error-type"
                          value={errorType}
                          onChange={(e) => setErrorType(e.target.value)}
                        >
                          {typeOptions.map((opt) => (
                            <option key={String(opt.value)} value={String(opt.value)}>
                              {opt.label || String(opt.value)}
                            </option>
                          ))}
                        </select>
                        {selectedOption?.description && (
                          <p className="field-hint">{selectedOption.description}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="s2-reason">하이라이트한 이유 (교과 근거 포함)</label>
                        <textarea
                          id="s2-reason"
                          className="textarea-sm"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="예: 발췌문에 해당 내용이 없고, 교과 범위를 벗어난 단정입니다."
                        />
                      </div>
                    </div>
                    <div className="input-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-pill"
                        disabled={submitting}
                        onClick={() => void submitFind()}
                      >
                        {submitting ? '제출 중…' : '제출 및 피드백 받기'}
                      </button>
                    </div>
                    {formError && <p className="form-error">{formError}</p>}
                  </div>
                )}

                {phase === 'correct' && (
                  <div className="correction-form">
                    <div className="correction-warning">
                      교정은 <strong>최종 1회</strong>만 제출할 수 있습니다.
                    </div>
                    {(detail.cleared_highlights.length
                      ? detail.cleared_highlights
                      : ['']
                    ).map((h, i) => (
                      <div key={h || i} style={{ marginBottom: 12 }}>
                        <label htmlFor={`s2-correction-${i}`}>
                          {h ? `「${h}」 수정 문장` : '수정 문장'}
                        </label>
                        <textarea
                          id={`s2-correction-${i}`}
                          rows={3}
                          value={h ? correctionAnswers[h] ?? '' : ''}
                          onChange={(e) =>
                            h &&
                            setCorrectionAnswers((prev) => ({ ...prev, [h]: e.target.value }))
                          }
                          placeholder="교과 자료에 맞게 올바른 문장으로 고쳐 보세요."
                        />
                      </div>
                    ))}
                    <div className="input-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-pill"
                        disabled={
                          submitting ||
                          detail.cleared_highlights.some((h) => !correctionAnswers[h]?.trim())
                        }
                        onClick={() => setConfirmOpen(true)}
                      >
                        교정 최종 제출
                      </button>
                    </div>
                    {formError && <p className="form-error">{formError}</p>}
                  </div>
                )}

                {phase === 'done' && (
                  <div className="done-card-bar">
                    <p>이 카드의 검증과 교정이 완료되었습니다.</p>
                    <Link to="/student" className="btn btn-primary btn-sm">
                      학습 화면으로
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="confirm-modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>교정을 최종 제출할까요?</h3>
            <p>제출 후에는 수정할 수 없습니다.</p>
            <div className="confirm-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={submitting}
                onClick={() => void submitCorrection()}
              >
                {submitting ? '제출 중…' : '최종 제출'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PdfViewerModal
        assignmentId={assignmentId}
        filename={pdfFilename}
        open={docOpen}
        onClose={() => setDocOpen(false)}
        fallbackText={
          assignmentId === STAGE2_DEMO_ASSIGNMENT_ID ? detail.reference_document_text : undefined
        }
      />
    </div>
  );
}
