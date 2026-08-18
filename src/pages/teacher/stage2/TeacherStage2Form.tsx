import { useState } from 'react';
import { ApiError, createTeacherAssignmentStep2Api } from '../../../api';
import type { Stage2CreateResponse } from '../../../api/types';
import { SUBJECT_OPTIONS } from '../../../constants/assignments';
import { learningModeByStage } from '../../../constants/navigation';
import { defaultDueAtLocal, localDateTimeToIso } from '../../../utils/datetime';

const HALLUCINATION_OPTIONS = [
  { value: 'RETRIEVAL_ERROR', label: '잘못된 문서 검색', defaultOn: true },
  { value: 'PERSONA_BIAS', label: '페르소나 편향', defaultOn: false },
  { value: 'INFORMATION_FABRICATION', label: '정보 날조', defaultOn: false },
] as const;

const STEP_LABELS = ['참고 문서', 'AI 페르소나', '환각 유형', '학생 질문', '오류 개수'];

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

/** stage2-ui 출제 위자드 + POST /teacher/assignments/step2 */
export function TeacherStage2Form() {
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState('hist');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [persona, setPersona] = useState('서양 열강이 개항기 조선을 주도했다고 믿는 동아시아사 선생님');
  const [question, setQuestion] = useState(
    '개항 이후 동아시아 정세 변화를 교과 자료 범위에서 설명해 주세요.',
  );
  const [hallucFlags, setHallucFlags] = useState(HALLUCINATION_OPTIONS.map((o) => o.defaultOn));
  const [errorCount, setErrorCount] = useState(1);
  const [previewing, setPreviewing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [preview, setPreview] = useState<Stage2CreateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);
    setError('');
    try {
      const title = question.trim().slice(0, 48) || 'Hallucination 탐지 과제';
      const res = await createTeacherAssignmentStep2Api({
        title,
        subject,
        question: question.trim(),
        persona: persona.trim().slice(0, 100),
        due_at: localDateTimeToIso(defaultDueAtLocal()),
        hallucination_types: [...hallucinationTypes],
        expected_error_count: errorCount,
        file: referenceFile,
      });
      setPreview(res);
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

  const resetWizard = () => {
    setStep(1);
    setReferenceFile(null);
    setFileInputKey((k) => k + 1);
    setPreviewing(false);
    setAccepted(false);
    setPreview(null);
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
          문서·페르소나·환각 유형을 단계별로 입력하면 AI가 의도적 오류를 포함한 답변을 생성합니다.
        </p>

        <div className="teacher-subject-field">
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

        <StepIndicator currentStep={step} previewing={previewing} accepted={accepted} />

          {accepted && preview ? (
            <div className="teacher-success">
              <div className="teacher-success-title">과제를 게시했습니다.</div>
              <p>학생들이 학습 화면에서 Hallucination 탐지를 시작할 수 있어요.</p>
              <p className="teacher-published-ids">과제 ID: {preview.assignment_id}</p>
              <button type="button" className="btn btn-ghost" onClick={resetWizard}>
                새 과제 만들기
              </button>
            </div>
          ) : previewing && preview ? (
            <div className="teacher-preview">
              <div className="teacher-preview-box">
                <div className="teacher-preview-label">AI 답변 미리보기 · 과제 #{preview.assignment_id}</div>
                <p>{preview.flawed_ai_response}</p>
                <p className="field-hint" style={{ marginTop: 10 }}>
                  의도적 오류 {preview.expected_error_count}개 · 생성된 오류 구간{' '}
                  {preview.generated_errors?.length ?? 0}개
                </p>
              </div>
              <div className="teacher-actions">
                <button type="button" className="btn btn-ghost" onClick={resetWizard}>
                  새 과제 만들기
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setAccepted(true)}>
                  확인
                </button>
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
                        <label key={opt.value} className="teacher-check-item">
                          <input
                            type="checkbox"
                            checked={hallucFlags[index]}
                            onChange={() => toggleHalluc(index)}
                          />
                          {opt.label}
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
                    <label htmlFor="error-count">의도적 오류 개수</label>
                    <select
                      id="error-count"
                      value={errorCount}
                      onChange={(e) => setErrorCount(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}개
                        </option>
                      ))}
                    </select>
                    <p className="field-hint">AI가 답변 안에 넣을 의도적 오류 개수입니다.</p>
                  </div>
                  <aside className="teacher-aside">
                    <strong>생성 안내</strong>
                    <ul>
                      <li>생성과 동시에 과제가 학생에게 배정됩니다</li>
                      <li>미리보기에서 생성된 오답을 확인할 수 있어요</li>
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
                  {loading ? '생성 중…' : step < 5 ? '다음' : 'AI 답변 생성'}
                </button>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
