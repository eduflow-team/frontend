import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ApiError,
  createTeacherAssignmentStep2Api,
  createTeacherAssignmentStep2SetApi,
  fetchTeacherClassesApi,
  fetchTeacherAssignmentStep2SetApi,
  publishTeacherAssignmentStep2SetApi,
} from '../../../api';
import type { ClassItem, Stage2CreateResponse, Stage2SetCardPreview } from '../../../api/types';
import { HALLUCINATION_LABELS, SUBJECT_OPTIONS } from '../../../constants/assignments';
import { learningModeByStage } from '../../../constants/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { defaultDueAtLocal, localDateTimeToIso } from '../../../utils/datetime';
import { formatClassLabel } from '../../../utils/labels';

const HALLUCINATION_OPTIONS = [
  { value: 'RETRIEVAL_ERROR', label: '잘못된 문서 검색', defaultOn: true },
  { value: 'PERSONA_BIAS', label: '페르소나 편향', defaultOn: false },
  { value: 'INFORMATION_FABRICATION', label: '정보 날조', defaultOn: false },
] as const;

const STEP_LABELS = ['참고 문서', 'AI 페르소나', '환각 유형', '학생 질문', '후보 개수'];

const REFERENCE_ACCEPT = '.pdf,.txt,.md,.markdown';

function StepIndicator({
  currentStep,
  previewing,
  accepted,
}: {
  currentStep: number;
  previewing: boolean;
  accepted: boolean;
}) {
  const active = previewing || accepted ? 6 : currentStep;
  return (
    <div className="teacher-steps">
      {STEP_LABELS.map((label, index) => {
        const n = index + 1;
        const done = n < active;
        const isActive = n === active;
        return (
          <div key={label} className="teacher-step-row">
            <div className="teacher-step-item">
              <span className={`teacher-step-circle${done ? ' done' : ''}${isActive ? ' active' : ''}`}>
                {done ? '✓' : n}
              </span>
              <span className={`teacher-step-label${isActive ? ' active' : ''}`}>{label}</span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div className={`teacher-step-line${n < active ? ' done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function selectSuccessfulCards(cards: Stage2SetCardPreview[]) {
  return cards
    .filter((card) => card.generation_succeeded && card.assignment_id != null)
    .map((card) => card.assignment_id as number);
}

function singleCreateToCard(preview: Stage2CreateResponse): Stage2SetCardPreview {
  return {
    assignment_id: preview.assignment_id,
    card_index: 0,
    title: preview.title,
    flawed_ai_response: preview.flawed_ai_response,
    expected_error_count: 1,
    generation_error_type: preview.generated_errors[0]?.error_type ?? '',
    generated_errors: preview.generated_errors,
    publish_status: 'PUBLISHED',
    generation_succeeded: true,
    failure_codes: [],
  };
}

/** stage2-ui 출제 위자드 + 카드 세트 생성/선택 게시 */
export function TeacherStage2Form() {
  const { user } = useAuth();
  const useApi = Boolean(user);
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [subject, setSubject] = useState('hist');
  const [dueAt, setDueAt] = useState(defaultDueAtLocal());
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [persona, setPersona] = useState('서양 열강이 개항기 조선을 주도했다고 믿는 동아시아사 선생님');
  const [question, setQuestion] = useState(
    '개항 이후 동아시아 정세 변화를 교과 자료 범위에서 설명해 주세요.',
  );
  const [hallucFlags, setHallucFlags] = useState(HALLUCINATION_OPTIONS.map((o) => o.defaultOn));
  const [cardCount, setCardCount] = useState(2);
  const [previewing, setPreviewing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [setId, setSetId] = useState<number | null>(null);
  const [previewCards, setPreviewCards] = useState<Stage2SetCardPreview[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [publishedIds, setPublishedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!useApi) return;
    fetchTeacherClassesApi()
      .then((res) => {
        setClasses(res.classes);
        const firstClass = res.classes[0];
        if (firstClass) setClassId(firstClass.class_id);
      })
      .catch(() => setClasses([]));
  }, [useApi]);

  useEffect(() => {
    const raw = searchParams.get('setId');
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;

    let cancelled = false;
    (async () => {
      setError('');
      try {
        const res = await fetchTeacherAssignmentStep2SetApi(id);
        if (cancelled) return;
        setSetId(res.set_id);
        setPreviewCards(res.cards);
        setSelectedIds(selectSuccessfulCards(res.cards));
        setPublishedIds(
          res.cards
            .filter((c) => c.publish_status === 'PUBLISHED' && c.assignment_id != null)
            .map((c) => c.assignment_id as number),
        );
        setPreviewing(true);
        setAccepted(false);
        if (selectSuccessfulCards(res.cards).length === 0) {
          setError('생성에 성공한 후보가 없습니다. 다시 시도해 주세요.');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '미리보기를 불러오지 못했습니다.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const hallucinationTypes = HALLUCINATION_OPTIONS.filter((_, i) => hallucFlags[i]).map(
    (o) => o.value,
  );

  const toggleHalluc = (index: number) => {
    setHallucFlags((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const validateStep = () => {
    if (step === 1 && !referenceFile) return '참고 문서 PDF를 업로드해 주세요.';
    if (step === 2 && !persona.trim()) return 'AI 페르소나를 입력해 주세요.';
    if (step === 3 && hallucinationTypes.length === 0) return '환각 유형을 하나 이상 선택해 주세요.';
    if (step === 4 && !question.trim()) return '학생 질문을 입력해 주세요.';
    return '';
  };

  const handleNext = () => {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    if (step < 5) {
      setStep((s) => s + 1);
      return;
    }
    void generatePreview();
  };

  const generatePreview = async () => {
    if (!referenceFile) {
      setError('참고 문서를 업로드해 주세요.');
      return;
    }
    if (useApi && classId === '') {
      setError('학급을 선택해 주세요.');
      return;
    }
    if (!dueAt.trim()) {
      setError('과제 마감일을 선택해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setSetId(null);
    setPreviewCards([]);
    setSelectedIds([]);
    setPublishedIds([]);
    setAccepted(false);
    try {
      // 제목은 학생 화면 헤더에 노출되므로 질문 문장을 그대로 쓰지 않는다
      const subjectLabel = SUBJECT_OPTIONS.find((s) => s.value === subject)?.label ?? '';
      const title = `${subjectLabel ? `${subjectLabel} · ` : ''}Hallucination 탐지`;
      const base = {
        title,
        subject,
        question: question.trim(),
        persona: persona.trim().slice(0, 100),
        due_at: localDateTimeToIso(dueAt),
        hallucination_types: [...hallucinationTypes],
        file: referenceFile,
      };

      if (cardCount === 1) {
        const res = await createTeacherAssignmentStep2Api({
          ...base,
          expected_error_count: 1,
        });
        const card = singleCreateToCard(res);
        setPreviewCards([card]);
        setSelectedIds([res.assignment_id]);
        setPublishedIds([res.assignment_id]);
        setAccepted(true);
      } else {
        const res = await createTeacherAssignmentStep2SetApi({
          ...base,
          card_count: cardCount,
        });
        setSetId(res.set_id);
        setPreviewCards(res.cards);
        setSelectedIds(selectSuccessfulCards(res.cards));
        if (selectSuccessfulCards(res.cards).length === 0) {
          setError('생성에 성공한 후보가 없습니다. 다시 시도해 주세요.');
        }
      }
      setPreviewing(true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.message.includes('권한'))) {
        setError(
          '2단계 과제 생성 권한이 없습니다. 교사 계정에 학급이 연결되어 있는지 확인해 주세요.',
        );
      } else {
        setError(err instanceof ApiError ? err.message : 'AI 답변 생성에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidate = (assignmentId: number) => {
    setSelectedIds((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId],
    );
  };

  const refreshPreview = async () => {
    if (setId == null) return;
    setError('');
    try {
      const res = await fetchTeacherAssignmentStep2SetApi(setId);
      setPreviewCards(res.cards);
      setSelectedIds((prev) => {
        const available = selectSuccessfulCards(res.cards);
        const kept = prev.filter((id) => available.includes(id));
        return kept.length ? kept : available;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '미리보기를 불러오지 못했습니다.');
    }
  };

  const publishSelected = async () => {
    if (setId == null || selectedIds.length === 0) {
      setError('게시할 후보를 선택해 주세요.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const res = await publishTeacherAssignmentStep2SetApi(setId, selectedIds);
      setPublishedIds(res.published_assignment_ids);
      setPreviewCards((prev) =>
        prev.map((card) =>
          card.assignment_id != null && res.published_assignment_ids.includes(card.assignment_id)
            ? { ...card, publish_status: 'PUBLISHED' }
            : card,
        ),
      );
      setAccepted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '과제 게시에 실패했습니다.');
    } finally {
      setPublishing(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setReferenceFile(null);
    setFileInputKey((k) => k + 1);
    setPreviewing(false);
    setAccepted(false);
    setSetId(null);
    setPreviewCards([]);
    setSelectedIds([]);
    setPublishedIds([]);
    setError('');
  };

  return (
    <div className="s2">
      <div className="shell teacher-shell">
        <nav className="steps teacher-flow-steps" aria-label="진행 단계">
          <div className="step" aria-current="step">
            과제 만들기
          </div>
          <div className="step">학생 학습</div>
          <div className="step">결과 확인</div>
        </nav>

        <h1 className="page-title">{learningModeByStage(2)?.module ?? 'Hallucination 탐지'}</h1>
        <p className="page-desc">
          문서·페르소나·환각 유형을 단계별로 입력하면 AI가 의도적 오류를 포함한 후보 카드를 생성합니다.
          카드마다 학생이 찾을 환각은 1개입니다.
        </p>

        <div className="teacher-meta-row">
          <div className="teacher-meta-field">
            <label className="label" htmlFor="s2-class">
              학급 선택
            </label>
            <select
              id="s2-class"
              className="field"
              value={classId}
              onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
              disabled={!useApi || previewing || accepted}
            >
              <option value="">학급 선택</option>
              {classes.map((cls) => (
                <option key={cls.class_id} value={cls.class_id}>
                  {formatClassLabel(cls.grade, cls.class_number)}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-meta-field">
            <label className="label" htmlFor="s2-subject">
              담당 교과
            </label>
            <select
              id="s2-subject"
              className="field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={previewing || accepted}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-meta-field">
            <label className="label" htmlFor="s2-due">
              과제 마감일
            </label>
            <input
              id="s2-due"
              className="field"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={previewing || accepted}
            />
          </div>
        </div>

        <StepIndicator currentStep={step} previewing={previewing} accepted={accepted} />

        {accepted && publishedIds.length > 0 ? (
          <div className="teacher-success">
            <div className="teacher-success-title">과제를 게시했습니다.</div>
            <p>학생들이 학습 화면에서 Hallucination 탐지를 시작할 수 있어요.</p>
            <p className="teacher-published-ids">
              과제 ID: {publishedIds.map((id) => `#${id}`).join(', ')}
            </p>
            <button type="button" className="btn btn-ghost" onClick={resetWizard}>
              새 과제 만들기
            </button>
          </div>
        ) : previewing && previewCards.length > 0 ? (
          <div className="teacher-preview">
            <div className="teacher-preview-stack">
              {previewCards.map((card) => {
                const assignmentId = card.assignment_id;
                const selected = assignmentId != null && selectedIds.includes(assignmentId);
                const disabled = !card.generation_succeeded || assignmentId == null;
                const errorSentence = card.generated_errors[0]?.error_sentence?.trim() ?? '';
                return (
                  <div
                    key={`card-${card.card_index}`}
                    className={`teacher-preview-box${selected ? ' selected' : ''}${disabled ? ' is-failed' : ''}`}
                  >
                    <label className="teacher-preview-label teacher-preview-label-row">
                      {setId != null && (
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled || card.publish_status === 'PUBLISHED'}
                          onChange={() => assignmentId != null && toggleCandidate(assignmentId)}
                          aria-label={`카드 ${card.card_index + 1} 선택`}
                        />
                      )}
                      <span>
                        카드 {card.card_index + 1}
                        {assignmentId != null ? ` · 과제 #${assignmentId}` : ''}
                        {card.publish_status === 'PUBLISHED' ? ' · 게시됨' : ''}
                      </span>
                    </label>
                    {card.generation_succeeded ? (
                      <>
                        <p className="teacher-preview-response">
                          {errorSentence && card.flawed_ai_response.includes(errorSentence) ? (
                            <>
                              {card.flawed_ai_response.split(errorSentence)[0]}
                              <span className="verify-error-span is-hit">{errorSentence}</span>
                              {card.flawed_ai_response.split(errorSentence).slice(1).join(errorSentence)}
                            </>
                          ) : (
                            card.flawed_ai_response
                          )}
                        </p>
                        {card.generated_errors.map((generatedError) => (
                          <p key={generatedError.answer_id} className="field-hint" style={{ marginTop: 8 }}>
                            {HALLUCINATION_LABELS[generatedError.error_type] ?? generatedError.error_type}
                            {' · '}
                            {generatedError.error_sentence}
                          </p>
                        ))}
                      </>
                    ) : (
                      <p className="form-error">
                        생성 실패: {card.failure_codes.join(', ') || '알 수 없는 오류'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="teacher-actions">
              <button type="button" className="btn btn-ghost" onClick={resetWizard}>
                다시 생성
              </button>
              {setId != null && (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => void refreshPreview()}>
                    미리보기 새로고침
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={publishing || selectedIds.length === 0}
                    onClick={() => void publishSelected()}
                  >
                    {publishing ? '게시 중…' : `선택한 ${selectedIds.length}개 게시`}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 1 · 5</span>
                  <label htmlFor="teacher-doc-file">참고 문서</label>
                  <div className="teacher-file-upload">
                    <input
                      id="teacher-doc-file"
                      key={fileInputKey}
                      type="file"
                      accept={REFERENCE_ACCEPT}
                      className="teacher-file-input"
                      onChange={(e) => {
                        setReferenceFile(e.target.files?.[0] ?? null);
                        setError('');
                      }}
                    />
                    <div className="teacher-file-drop">
                      <p className="teacher-file-title">PDF 교과 자료를 업로드하세요</p>
                      <p className="teacher-file-hint">PDF 권장 · TXT·MD도 가능</p>
                      <label htmlFor="teacher-doc-file" className="btn btn-ghost btn-sm teacher-file-btn">
                        파일 선택
                      </label>
                    </div>
                    {referenceFile && (
                      <div className="teacher-file-selected">
                        <strong>{referenceFile.name}</strong>
                        <span>{(referenceFile.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          className="teacher-file-remove"
                          onClick={() => {
                            setReferenceFile(null);
                            setFileInputKey((k) => k + 1);
                          }}
                        >
                          제거
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <aside className="teacher-aside">
                  <strong>좋은 참고 문서 조건</strong>
                  <ul>
                    <li>교과 PDF·발췌본을 업로드하세요</li>
                    <li>구체적 사실과 연도가 포함되면 좋아요</li>
                    <li>학생이 이미 배운 범위여야 해요</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 2 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 2 · 5</span>
                  <label htmlFor="teacher-persona">AI 페르소나 (최대 100자)</label>
                  <input
                    id="teacher-persona"
                    value={persona}
                    maxLength={100}
                    onChange={(e) => setPersona(e.target.value)}
                    placeholder="예: 장영실이 연을 만들었다고 믿는 한국사 선생님"
                  />
                </div>
                <aside className="teacher-aside">
                  <strong>페르소나 작성 가이드</strong>
                  <ul>
                    <li>과목·인물 특성을 구체적으로 적어주세요</li>
                    <li>&quot;~라고 믿는&quot; 형태가 오류 유도에 효과적이에요</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 3 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 3 · 5</span>
                  <span className="field-label">환각 유형 (중복 선택 가능)</span>
                  <div className="teacher-checklist">
                    {HALLUCINATION_OPTIONS.map((opt, index) => (
                      <label
                        key={opt.value}
                        className={`teacher-check-item${hallucFlags[index] ? ' checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={hallucFlags[index]}
                          onChange={() => toggleHalluc(index)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <aside className="teacher-aside">
                  <strong>환각 유형 예시</strong>
                  <ul>
                    <li>잘못된 문서 검색 — 관련 없는 문서에서 근거를 가져옴</li>
                    <li>페르소나 편향 — 페르소나 설정 때문에 사실 왜곡</li>
                    <li>정보 날조 — 문서에 없는 내용을 새로 만들어냄</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 4 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 4 · 5</span>
                  <label htmlFor="teacher-question">학생에게 제공할 질문</label>
                  <textarea
                    id="teacher-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={6}
                    placeholder="예: 개항 이후 동아시아 정세 변화를 설명해 주세요."
                  />
                </div>
                <aside className="teacher-aside">
                  <strong>질문 작성 가이드</strong>
                  <ul>
                    <li>교과서 범위를 벗어나지 않게 질문하세요</li>
                    <li>서술형으로 답을 유도하는 질문이 좋아요</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 5 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 5 · 5</span>
                  <label htmlFor="candidate-count">후보 카드 개수 (최대 3개)</label>
                  <select
                    id="candidate-count"
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}개
                      </option>
                    ))}
                  </select>
                  <p className="field-hint">
                    후보를 여러 개 만들면 미리보기에서 선택한 카드만 게시합니다. 카드마다 환각은 1개입니다.
                  </p>
                </div>
                <aside className="teacher-aside">
                  <strong>생성 안내</strong>
                  <ul>
                    <li>1개면 바로 게시됩니다</li>
                    <li>2개 이상이면 미리보기 후 선택 게시합니다</li>
                  </ul>
                </aside>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}

            <div className="teacher-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={step === 1 || loading}
                onClick={() => setStep((s) => s - 1)}
              >
                이전
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={handleNext}
              >
                {loading ? '생성 중…' : step < 5 ? '다음' : 'AI 후보 생성'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
