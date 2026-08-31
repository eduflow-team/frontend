import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Stage2HelpGuide, Stage2RubricGuide } from '../../../components/student/stage2/Stage2StudentGuide';
import { HALLUCINATION_TYPE_GUIDE } from '../../../constants/stage2StudentGuide';
import {
  Stage2Tour,
  STAGE2_STUDENT_TOUR_STEPS,
  STAGE2_CORRECTION_TOUR_STEPS,
  filterStage2FindTourSteps,
  filterStage2CorrectionTourSteps,
} from '../../../components/student/stage2/Stage2Tour';
import { PdfViewerModal } from '../../../components/student/stage2/PdfViewerModal';
import {
  Stage2WorkflowSteps,
  buildStage2WorkflowSteps,
} from '../../../components/student/stage2/Stage2WorkflowSteps';
import { StudentStage2Done } from '../../../components/student/stage2/StudentStage2Done';
import { SHOW_STAGE2_EXCERPT_PANEL } from '../../../constants/stage2StudentGuide';
import { verifyIntro, type VerifyPhase } from '../../../types/stage2';
type Rubric = { evidence: string; errorId: string; rewrite: string };

const HALLUCINATION_LABELS: Record<string, string> = {
  PERSONA_BIAS: '페르소나 편향',
  INFORMATION_FABRICATION: '정보 날조',
  RETRIEVAL_ERROR: '잘못된 문서 검색',
};

function RubricDot({ mark }: { mark: string }) {
  if (mark === '✓') return <span className="rubric-dot rubric-dot-full" aria-label="완료" />;
  if (mark === '△') return <span className="rubric-dot rubric-dot-half" aria-label="부분 완료" />;
  return <span className="rubric-dot rubric-dot-empty" aria-label="미완료" />;
}

function pickSentenceAtPoint(container: HTMLElement, clientX: number, clientY: number) {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  let node: Node | null = null;
  let offset = 0;
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (!range) return '';
    node = range.startContainer;
    offset = range.startOffset;
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (!pos) return '';
    node = pos.offsetNode;
    offset = pos.offset;
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !container.contains(node)) return '';
  const text = node.textContent || '';
  if (!text.trim()) return '';
  let start = offset;
  let end = offset;
  while (start > 0 && !/[.!?。\n]/.test(text[start - 1] ?? '')) start -= 1;
  while (end < text.length && !/[.!?。\n]/.test(text[end] ?? '')) end += 1;
  if (end < text.length && /[.!?。]/.test(text[end] ?? '')) end += 1;
  return text.slice(start, end).trim();
}

function getSelectionTextWithin(container: HTMLElement | null) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !container) return '';
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return '';
  return selection.toString().trim();
}

function pickNeedleInFlawed(flawedAiResponse: string, errorSentence: string) {
  const displayed = (flawedAiResponse || '').replace(/\s+/g, ' ').trim();
  const target = (errorSentence || '').replace(/\s+/g, ' ').trim();
  if (!displayed || !target) return null;
  if (displayed.includes(target)) return target;
  for (let len = target.length; len >= 8; len -= 1) {
    const prefix = target.slice(0, len);
    if (displayed.includes(prefix)) return prefix;
  }
  for (let len = Math.min(32, target.length); len >= 8; len -= 1) {
    for (let i = 0; i <= target.length - len; i += 1) {
      const sub = target.slice(i, i + len);
      if (displayed.includes(sub)) return sub;
    }
  }
  return null;
}

function buildAiResponseParts(
  flawedAiResponse: string,
  clearedHighlights: string[],
  pendingHighlight?: string,
) {
  if (!flawedAiResponse) return [{ type: 'text' as const, value: '' }];

  type MarkType = 'cleared' | 'pending';
  const marks: { value: string; type: MarkType }[] = [];
  for (const span of [...clearedHighlights].filter(Boolean)) {
    marks.push({ value: span, type: 'cleared' });
  }
  const pending = pendingHighlight?.trim();
  if (pending) {
    const needle = pickNeedleInFlawed(flawedAiResponse, pending) || pending;
    if (needle && !clearedHighlights.some((c) => c.includes(needle) || needle.includes(c))) {
      marks.push({ value: needle, type: 'pending' });
    }
  }
  marks.sort((a, b) => b.value.length - a.value.length);

  if (marks.length === 0) return [{ type: 'text' as const, value: flawedAiResponse }];

  const parts: { type: 'text' | 'cleared' | 'pending'; value: string }[] = [];
  let cursor = 0;
  const text = flawedAiResponse;

  while (cursor < text.length) {
    let nearest: { value: string; type: MarkType } | null = null;
    let nearestIndex = text.length;
    for (const mark of marks) {
      const idx = text.indexOf(mark.value, cursor);
      if (idx !== -1 && idx < nearestIndex) {
        nearest = mark;
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
    parts.push({ type: nearest.type, value: nearest.value });
    cursor = nearestIndex + nearest.value.length;
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
  const [searchParams] = useSearchParams();
  const uiPreviewPhase = import.meta.env.DEV ? searchParams.get('previewPhase') : null;

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
  const [tourOpen, setTourOpen] = useState(false);
  const [tourMode, setTourMode] = useState<'find' | 'correct'>('find');
  const [tourSchedule, setTourSchedule] = useState<'find' | 'correct' | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rubricHelpOpen, setRubricHelpOpen] = useState(false);

  const scheduleTour = useCallback((mode: 'find' | 'correct') => {
    setTourOpen(false);
    setTourMode(mode);
    setTourSchedule(mode);
  }, []);

  const enterCorrectionPhase = useCallback(() => {
    setPhase('correct');
    scheduleTour('correct');
  }, [scheduleTour]);

  useEffect(() => {
    if (!tourSchedule || loading || !detail) return;
    const phaseReady =
      (tourSchedule === 'find' && phase === 'find') ||
      (tourSchedule === 'correct' && phase === 'correct');
    if (!phaseReady) return;

    const t = window.setTimeout(() => {
      setTourOpen(true);
      setTourSchedule(null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [tourSchedule, loading, detail, phase]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setTourOpen(false);
    setTourSchedule(null);
    try {
      const raw = await getStudentStep2Api(assignmentId);
      let data = raw;
      if (uiPreviewPhase === 'done') {
        data = {
          ...raw,
          status: 'COMPLETED',
          highlight_phase_complete: true,
          remaining_errors_to_find: 0,
          cleared_highlights: raw.cleared_highlights?.length
            ? raw.cleared_highlights
            : [raw.flawed_ai_response?.slice(0, 120).trim() || 'AI 답변 중 틀린 문장'],
        };
        setCorrectionResult({
          is_passed: true,
          score: 92,
          final_correct_sentence: '교과 자료에 맞게 교정한 문장입니다.',
          feedback_details: [
            {
              student_found_error: data.cleared_highlights[0] || '',
              student_answer: '교과 자료에 맞게 교정한 문장입니다.',
              is_item_passed: true,
              hallucination_reason: '',
              reference_evidence: '',
              ai_feedback:
                '교정 문장이 교과 근거와 잘 맞습니다. 환각 탐지·교정을 모두 완료했습니다.',
            },
          ],
        });
        setRubric({ evidence: '✓', errorId: '✓', rewrite: '✓' });
        setLastResult({
          highlighted_text: data.cleared_highlights[0] || '',
          student_error_type: data.hallucination_type_hints?.[0] || 'INFORMATION_FABRICATION',
          student_reason:
            '교과 자료에는 조·청·일 관계만 나오는데 AI는 근거 없는 내용을 넣었습니다.',
          is_correct: true,
          evaluation_report: {
            location_match_score: 0.95,
            error_type_match: true,
            reasoning_score: 0.96,
            ai_feedback: '위치·유형·근거가 모두 적절합니다.',
          },
        });
      } else if (uiPreviewPhase === 'correct' && raw.status !== 'COMPLETED') {
        data = {
          ...raw,
          highlight_phase_complete: true,
          remaining_errors_to_find: 0,
          cleared_highlights: raw.cleared_highlights?.length
            ? raw.cleared_highlights
            : [raw.flawed_ai_response?.slice(0, 120).trim() || 'AI 답변 중 틀린 문장'],
        };
      }
      setDetail(data);
      if (uiPreviewPhase === 'done') {
        setPhase('done');
      } else if (uiPreviewPhase === 'find') {
        setPhase('find');
      } else if (data.status === 'COMPLETED') {
        setPhase('done');
      } else if (data.highlight_phase_complete) {
        setPhase('correct');
      } else {
        setPhase('find');
      }
      setErrorType('');
      if (data.cleared_highlights?.length) {
        setCorrectionAnswers((prev) => {
          const next = { ...prev };
          for (const h of data.cleared_highlights) {
            if (next[h] == null) next[h] = '';
          }
          return next;
        });
      }
      if (uiPreviewPhase !== 'done') {
        if (data.status !== 'COMPLETED') {
          scheduleTour(data.highlight_phase_complete ? 'correct' : 'find');
        }
      }
    } catch (err) {
      setDetail(null);
      setLoadError(err instanceof ApiError ? err.message : '과제를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, scheduleTour, uiPreviewPhase]);

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
  const selectedTypeGuide = useMemo(
    () => HALLUCINATION_TYPE_GUIDE.find((g) => g.value === errorType),
    [errorType],
  );
  const highlightDone = Boolean(detail?.highlight_phase_complete);
  const attemptsBlocked = detail?.attempts?.remaining_attempts === 0;
  const showFindForm = phase === 'find' && !highlightDone && !attemptsBlocked;
  const showFeedback = Boolean(lastResult) && phase === 'find' && !attemptsBlocked;

  const workflowSteps = useMemo(
    () =>
      buildStage2WorkflowSteps({
        phase: phase === 'done' ? 'done' : phase,
        highlightDone,
      }),
    [phase, highlightDone],
  );

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

  const onSelectMouseUp = (event: MouseEvent) => {
    if (!showFindForm) return;
    const text = getSelectionTextWithin(aiRef.current);
    if (text) {
      setSelectedText(text);
      return;
    }
    if (!aiRef.current) return;
    const sentence = pickSentenceAtPoint(aiRef.current, event.clientX, event.clientY);
    if (sentence.length >= 4) {
      setSelectedText(sentence);
      window.getSelection()?.removeAllRanges();
    }
  };

  if (loading) {
    return (
      <div className="s2-student">
        <div className="shell wide">
          <p className="work-intro-muted">과제를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="s2-student">
        <div className="shell wide">
          <p className="form-error">{loadError || '과제 정보가 없습니다.'}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadDetail()}>
            다시 시도
          </button>
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
  const parts = buildAiResponseParts(
    detail.flawed_ai_response,
    detail.cleared_highlights,
    phase === 'find' && showFindForm ? selectedText : undefined,
  );
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
    SHOW_STAGE2_EXCERPT_PANEL && (detail.hallucination_type_hints?.length ?? 0) > 0
      ? detail.hallucination_type_hints
          .map((h) => HALLUCINATION_LABELS[h] ?? typeOptions.find((o) => String(o.value) === h)?.label ?? h)
          .join(' · ')
      : null;

  const attemptPct = maxAttempts > 0 ? Math.min(100, (usedAttempts / maxAttempts) * 100) : 0;

  let tourSteps =
    tourMode === 'correct'
      ? filterStage2CorrectionTourSteps(STAGE2_CORRECTION_TOUR_STEPS)
      : filterStage2FindTourSteps(STAGE2_STUDENT_TOUR_STEPS, canOpenPdf, showFindForm);

  if (phase === 'done') {
    return (
      <StudentStage2Done
        detail={detail}
        title={title}
        rubric={rubric}
        correctionResult={correctionResult}
        lastFindResult={lastResult}
        onRetry={() => {
          window.location.href = '/student';
        }}
      />
    );
  }

  return (
    <div className="s2-student">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · Hallucination 탐지</span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="help-btn"
              title="풀이 방법 · 환각 유형"
              aria-label="풀이 방법 · 환각 유형"
              onClick={() => setHelpOpen(true)}
            >
              ?
            </button>
          </div>
        </header>

        <nav className="steps" aria-label="진행 단계">
          <div className="step is-done">과제 선택</div>
          <div className="step is-current" aria-current="step">
            환각 탐지
          </div>
          <div className="step is-muted">결과 확인</div>
        </nav>

        <div className="debate-head">
          <div>
            <h1>환각 검증</h1>
            <p className="topic">{title}</p>
          </div>
          <div className="progress-wrap">
            <span className="pill">
              {phase === 'correct' ? '교정' : `시도 ${usedAttempts}/${maxAttempts}`}
            </span>
            <div className="progress-bar">
              <span style={{ width: `${attemptPct}%` }} />
            </div>
          </div>
        </div>

        <div className="play-grid">
          <aside className="side-col">
            {canOpenPdf && (
              <section className="info-card" data-tour="s2-tour-pdf">
                <div className="info-card-head">
                  <span className="info-icon" aria-hidden="true">
                    ▦
                  </span>
                  <p className="side-title">교과 PDF</p>
                </div>
                <div className="file-card">
                  <div className="file-badge">PDF</div>
                  <div className="file-meta">
                    <strong title={pdfFilename}>{pdfFilename}</strong>
                    <span>AI 지문과 대조</span>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDocOpen(true)}>
                    보기
                  </button>
                </div>
              </section>
            )}

            <Stage2WorkflowSteps steps={workflowSteps} />

            <section className="info-card" data-tour="s2-tour-rubric">
              <div className="info-card-head info-card-head-row">
                <span className="info-icon" aria-hidden="true">
                  ◇
                </span>
                <p className="side-title">채점 기준</p>
                <button
                  type="button"
                  className="card-help-btn"
                  title="채점 기준 보기"
                  aria-label="채점 기준 보기"
                  onClick={() => setRubricHelpOpen(true)}
                >
                  ?
                </button>
              </div>
              <p className="hint hint-sm rubric-lead">제출할 때마다 아래 세 가지를 채점해요.</p>
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
            </section>

            {SHOW_STAGE2_EXCERPT_PANEL && (
              <section className="info-card">
                <div className="info-card-head">
                  <span className="info-icon" aria-hidden="true">
                    ◇
                  </span>
                  <p className="side-title">발췌</p>
                </div>
                <div className="doc-text">{detail.reference_document_text || '—'}</div>
                {hintText && <p className="hint hint-sm">{hintText}</p>}
              </section>
            )}
          </aside>

          <section className="chat-col">
            <div className="chat-card">
              <div className="chat-head">
                <div className="ai-head-main">
                  <span className="card-kicker">AI 생성 답변</span>
                  <span className="ai-passage-badge">검증 대상 지문</span>
                </div>
                <span className="pill">과제 #{detail.assignment_id}</span>
              </div>

              <div className="chat-card-body">
              {(phase === 'find' || phase === 'correct') && (
                <>
                  <div className="ai-passage-panel">
                    {phase === 'find' && showFindForm && (
                      <p className="ai-passage-action-hint">{verifyIntro(phase)}</p>
                    )}
                    {phase === 'correct' && (
                      <p className="ai-passage-action-hint">{verifyIntro(phase)}</p>
                    )}
                    <div
                      ref={aiRef}
                      className={`ai-passage-body ai-select-wrap${
                        phase === 'find' && showFindForm ? ' selectable' : ''
                      }${phase === 'correct' ? ' readonly' : ''}`}
                      data-tour="s2-tour-ai"
                      onMouseUp={phase === 'find' ? onSelectMouseUp : undefined}
                      role={phase === 'find' && showFindForm ? 'textbox' : undefined}
                      aria-label="AI 생성 답변 지문"
                    >
                      <div className="ai-response-text">
                        {parts.map((part, index) =>
                          part.type === 'cleared' ? (
                            <mark key={index} className="highlight-cleared" title="찾은 오류">
                              {part.value}
                            </mark>
                          ) : part.type === 'pending' ? (
                            <mark key={index} className="highlight-pending" title="선택한 오류">
                              {part.value}
                            </mark>
                          ) : (
                            <span key={index}>{part.value}</span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  {phase === 'find' && showFindForm && selectedText && (
                    <div className="selected-segment-chip">
                      <span className="selected-segment-chip-label">선택</span>
                      <span className="selected-segment-chip-text">{selectedText}</span>
                      <button
                        type="button"
                        className="selected-segment-chip-clear"
                        onClick={() => setSelectedText('')}
                        aria-label="선택 해제"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </>
              )}

              {showFindForm && (
                <div className="verify-form verify-form-workspace">
                  <div className="verify-form-body">
                    <div className="field-group" data-tour="s2-tour-type">
                      <span className="label" id="s2-error-type-label">
                        환각 유형
                      </span>
                      {typeOptions.length <= 3 ? (
                        <div
                          className="type-segment-row"
                          role="radiogroup"
                          aria-labelledby="s2-error-type-label"
                        >
                          {typeOptions.map((opt) => {
                            const value = String(opt.value);
                            const active = errorType === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`type-segment${active ? ' is-active' : ''}`}
                                onClick={() => setErrorType(value)}
                              >
                                {opt.label || value}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <select
                          id="s2-error-type"
                          className="field"
                          value={errorType}
                          onChange={(e) => setErrorType(e.target.value)}
                        >
                          <option value="">유형을 선택하세요</option>
                          {typeOptions.map((opt) => (
                            <option key={String(opt.value)} value={String(opt.value)}>
                              {opt.label || String(opt.value)}
                            </option>
                          ))}
                        </select>
                      )}
                      {errorType && (selectedTypeGuide || selectedOption?.description) && (
                        <p className="type-ref-oneline" aria-live="polite">
                          {selectedTypeGuide?.summary || selectedOption?.description}
                        </p>
                      )}
                    </div>
                    <div className="field-group field-group-write" data-tour="s2-tour-reason">
                      <label className="label" htmlFor="s2-reason">
                        왜 틀렸나요? (교과 근거)
                      </label>
                      <textarea
                        id="s2-reason"
                        className="field reason-field"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="예: 교과 자료에는 ○○라고 되어 있는데, AI는 △△라고 해서 틀렸습니다."
                      />
                    </div>
                    {formError && <p className="form-error">{formError}</p>}
                  </div>
                </div>
              )}

              {phase === 'correct' && (
                <div className="verify-form" data-tour="s2-tour-correction-intro">
                  <div className="correction-warning" data-tour="s2-tour-correction-warning">
                    교정은 <strong>최종 1회</strong>만 제출할 수 있습니다.
                  </div>
                  {(detail.cleared_highlights.length ? detail.cleared_highlights : ['']).map(
                    (h, i) => (
                      <div
                        key={h || i}
                        className="field-group"
                        {...(i === 0 ? { 'data-tour': 's2-tour-correction-input' } : {})}
                      >
                        <label className="label" htmlFor={`s2-correction-${i}`}>
                          {h ? `「${h}」 수정 문장` : '수정 문장'}
                        </label>
                        <textarea
                          id={`s2-correction-${i}`}
                          className="field"
                          rows={3}
                          value={h ? (correctionAnswers[h] ?? '') : ''}
                          onChange={(e) =>
                            h && setCorrectionAnswers((prev) => ({ ...prev, [h]: e.target.value }))
                          }
                          placeholder="교과 자료에 맞게 올바른 문장으로 고쳐 보세요."
                        />
                      </div>
                    ),
                  )}
                  {formError && <p className="form-error">{formError}</p>}
                </div>
              )}

              </div>

              {showFindForm && (
                <div className="chat-card-foot actions" data-tour="s2-tour-submit">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      submitting ||
                      !selectedText.trim() ||
                      !errorType ||
                      !reason.trim()
                    }
                    onClick={() => void submitFind()}
                  >
                    {submitting ? '제출 중…' : '제출 및 피드백 받기'}
                  </button>
                </div>
              )}

              {phase === 'correct' && (
                <div className="chat-card-foot actions" data-tour="s2-tour-correction-submit">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      submitting ||
                      detail.cleared_highlights.some((h) => !correctionAnswers[h]?.trim())
                    }
                    onClick={() => setConfirmOpen(true)}
                  >
                    교정 최종 제출
                  </button>
                </div>
              )}

              {showFeedback && lastResult && (
                <div className={`decide-bar feedback-bar in-card${lastResult.is_correct ? ' success' : ''}`}>
                  <p className="decide-q">{lastResult.is_correct ? '맞았습니다' : '다시 시도'}</p>
                  <p className="decide-sub">{report?.ai_feedback || '피드백을 확인해 주세요.'}</p>
                  {report && (
                    <div className="feedback-chips">
                      {locPct != null && <span>위치 {locPct}%</span>}
                      {reasonPct != null && <span>근거 {reasonPct}%</span>}
                      <span>유형 {report.error_type_match ? '✓' : '✗'}</span>
                    </div>
                  )}
                  {lastResult.is_correct && highlightDone && (
                    <div className="decide-actions">
                      <button type="button" className="btn btn-primary" onClick={enterCorrectionPhase}>
                        교정 단계로 이동
                      </button>
                    </div>
                  )}
                </div>
              )}

              {attemptsBlocked && phase === 'find' && !highlightDone && (
                <div className="decide-bar in-card">
                  <p className="decide-q">시도 횟수를 모두 사용했습니다</p>
                  <p className="decide-sub">
                    {lastResult?.evaluation_report?.ai_feedback ||
                      '환각 구간을 찾지 못했습니다. 교사에게 도움을 요청해 보세요.'}
                  </p>
                </div>
              )}

              {attemptsBlocked && phase === 'find' && highlightDone && (
                <div className="decide-bar in-card">
                  <p className="decide-q">시도 횟수를 모두 사용했습니다</p>
                  <p className="decide-sub">환각 구간은 찾았습니다. 교정 단계로 마무리해 주세요.</p>
                  <div className="decide-actions">
                    <button type="button" className="btn btn-primary" onClick={enterCorrectionPhase}>
                      교정 단계로 이동
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
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

      <Stage2Tour
        key={tourMode}
        open={tourOpen}
        steps={tourSteps}
        onFinish={() => setTourOpen(false)}
      />
      <Stage2HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} phase={phase} />
      <Stage2RubricGuide open={rubricHelpOpen} onClose={() => setRubricHelpOpen(false)} />

      <PdfViewerModal
        assignmentId={assignmentId}
        filename={pdfFilename}
        open={docOpen}
        onClose={() => setDocOpen(false)}
        excerptFallback={detail.reference_document_text}
      />
    </div>
  );
}
