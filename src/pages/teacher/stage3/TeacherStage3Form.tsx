import { useEffect, useState } from 'react';
import {
  ApiError,
  createTeacherAssignmentStep3Api,
  fetchTeacherClassesApi,
  previewTeacherAssignmentStep3DebateApi,
} from '../../../api';
import type { ClassItem, Stage3DebatePublicPayload, Stage3TurnPublic } from '../../../api/types';
import { SUBJECT_OPTIONS } from '../../../constants/assignments';
import { learningModeByStage } from '../../../constants/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { defaultDueAtLocal, formatDueAt, localDateTimeToIso } from '../../../utils/datetime';
import { formatClassLabel } from '../../../utils/labels';

const STEP_LABELS = ['토론 주제', 'AI 페르소나', '토론 생성', '미리보기'];
const NEEDS_CHECK = new Set(['exaggerated', 'unsupported', 'false']);
const VERDICT_LABEL: Record<string, string> = {
  supported: '근거 확인됨',
  exaggerated: '과장됨',
  unsupported: '근거 부족',
  false: '사실과 다름',
};

interface FlawPreviewItem {
  turnId: string;
  side: string;
  round: string;
  claim: string;
  verdict: string;
  reason: string;
}

function StepIndicator({ currentStep, published }: { currentStep: number; published: boolean }) {
  const active = published ? 5 : currentStep;
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

function collectFlaws(debate: Stage3DebatePublicPayload): FlawPreviewItem[] {
  const items: FlawPreviewItem[] = [];
  for (const turn of debate.turns) {
    appendTurnFlaws(turn, items);
  }
  return items;
}

function appendTurnFlaws(turn: Stage3TurnPublic, items: FlawPreviewItem[]) {
  const claims =
    turn.claims && turn.claims.length > 0
      ? turn.claims
      : turn.verdict && NEEDS_CHECK.has(turn.verdict)
        ? [{ claim: turn.claim, verdict: turn.verdict, reason: turn.why || '' }]
        : [];

  for (const claim of claims) {
    if (!NEEDS_CHECK.has(claim.verdict)) continue;
    items.push({
      turnId: turn.id,
      side: turn.side,
      round: turn.round,
      claim: claim.claim,
      verdict: claim.verdict,
      reason: claim.reason || turn.why || '',
    });
  }
}

/** stage3_ui 교사 출제 화면 — POST /teacher/assignments/step3 */
export function TeacherStage3Form() {
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo);

  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [subject, setSubject] = useState<string>(SUBJECT_OPTIONS[0]?.value ?? '');
  const [topic, setTopic] = useState('');
  const [proPersona, setProPersona] = useState('');
  const [conPersona, setConPersona] = useState('');
  const [dueAt, setDueAt] = useState(defaultDueAtLocal());
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [previewDebate, setPreviewDebate] = useState<Stage3DebatePublicPayload | null>(null);
  const [previewReused, setPreviewReused] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!useApi) return;
    fetchTeacherClassesApi()
      .then((res) => {
        setClasses(res.classes);
        const firstClass = res.classes[0];
        if (firstClass) setClassId(firstClass.class_id);
        else setClassId('');
      })
      .catch(() => {
        setClasses([]);
        setClassId('');
      });
  }, [useApi]);

  const validateMeta = (): string => {
    if (!useApi) return '데모 계정에서는 과제를 게시할 수 없습니다. 실제 계정으로 로그인해 주세요.';
    if (classes.length === 0) {
      return '담당 학급이 연결되지 않았습니다. 관리자에게 담임 학급 등록을 요청해 주세요.';
    }
    if (classId === '') return '학급을 선택해 주세요.';
    if (!dueAt.trim()) return '과제 마감일을 선택해 주세요.';
    return '';
  };

  const validateStep = (): string => {
    if (step === 1 && !topic.trim()) return '토론 주제를 입력해 주세요.';
    if (step === 2) {
      if (!proPersona.trim() || !conPersona.trim()) {
        return '찬성·반대 페르소나를 모두 입력해 주세요.';
      }
    }
    if (step >= 3) {
      const metaError = validateMeta();
      if (metaError) return metaError;
    }
    return '';
  };

  const handleNext = () => {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    if (step < 3) setStep((s) => s + 1);
  };

  const ensureAssignment = async (): Promise<number> => {
    if (assignmentId != null) return assignmentId;
    const res = await createTeacherAssignmentStep3Api({
      class_id: Number(classId),
      topic: topic.trim(),
      pro_persona: proPersona.trim().slice(0, 100),
      con_persona: conPersona.trim().slice(0, 100),
      title: topic.trim().slice(0, 48),
      subject,
      due_at: dueAt ? localDateTimeToIso(dueAt) : undefined,
    });
    setAssignmentId(res.assignment_id);
    return res.assignment_id;
  };

  const generatePreview = async () => {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const id = await ensureAssignment();
      const res = await previewTeacherAssignmentStep3DebateApi(id);
      setPreviewDebate(res.debate);
      setPreviewReused(res.reused);
      setStep(4);
      setToast(res.reused ? '저장된 토론 미리보기를 불러왔습니다.' : '토론을 생성했습니다.');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.message.includes('권한'))) {
        setError('선택한 학급에 출제 권한이 없습니다. 담당 학급을 골라 주세요.');
      } else {
        setError(err instanceof ApiError ? err.message : '토론 생성에 실패했습니다.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const finishPublish = () => {
    setPublished(true);
    setToast('과제를 게시했습니다.');
  };

  const resetWizard = () => {
    setStep(1);
    setTopic('');
    setProPersona('');
    setConPersona('');
    setDueAt(defaultDueAtLocal());
    setAssignmentId(null);
    setPreviewDebate(null);
    setPreviewReused(false);
    setPublished(false);
    setError('');
  };

  const subjectLabel = SUBJECT_OPTIONS.find((s) => s.value === subject)?.label ?? subject;
  const selectedClass = classes.find((c) => c.class_id === classId);
  const classLabel =
    selectedClass != null
      ? formatClassLabel(selectedClass.grade, selectedClass.class_number)
      : '—';
  const flawItems = previewDebate ? collectFlaws(previewDebate) : [];
  const metaLocked = generating || published || assignmentId != null;

  return (
    <div className="s3">
      <div className="shell teacher-shell">
        <nav className="steps teacher-flow-steps" aria-label="진행 단계">
          <div className="step" aria-current="step">
            과제 만들기
          </div>
          <div className="step">학생 학습</div>
          <div className="step">결과 확인</div>
        </nav>

        <h1 className="page-title">{learningModeByStage(3)?.module ?? 'AI 토론'}</h1>
        <p className="page-desc">
          주제와 양측 페르소나를 정하면 찬성·반대 AI가 번갈아 토론합니다. 학생은 평가자로 참여합니다.
        </p>

        <div className="teacher-meta-row">
          <div className="teacher-meta-field">
            <label className="label" htmlFor="s3-class">
              학급 선택
            </label>
            <select
              id="s3-class"
              className="field"
              value={classId}
              onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
              disabled={!useApi || metaLocked}
            >
              <option value="">학급 선택</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {formatClassLabel(c.grade, c.class_number)}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-meta-field">
            <label className="label" htmlFor="s3-subject">
              담당 교과
            </label>
            <select
              id="s3-subject"
              className="field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={metaLocked}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-meta-field">
            <label className="label" htmlFor="s3-due">
              과제 마감일
            </label>
            <input
              id="s3-due"
              className="field"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={metaLocked}
            />
          </div>
        </div>

        <StepIndicator currentStep={step} published={published} />

        {published && assignmentId != null ? (
          <div className="teacher-success">
            <div className="teacher-success-title">과제를 게시했습니다.</div>
            <p>학생들이 AI 토론 평가 활동을 시작할 수 있어요.</p>
            <p className="teacher-published-ids">
              과제 ID: #{assignmentId}
              {dueAt ? ` · 마감 ${formatDueAt(localDateTimeToIso(dueAt))}` : ''}
            </p>
            <button type="button" className="btn btn-ghost" onClick={resetWizard}>
              새 과제 만들기
            </button>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 1 · 4</span>
                  <label htmlFor="topicInput">토론 주제</label>
                  <input
                    id="topicInput"
                    type="text"
                    placeholder="예: 학교에 AI 시험 감독 시스템을 도입해야 하는가?"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={generating}
                  />
                  <p className="field-hint">찬반이 갈리는 주제일수록 근거 비교가 잘 드러납니다.</p>
                </div>
                <aside className="teacher-aside">
                  <strong>주제 작성 가이드</strong>
                  <ul>
                    <li>찬반이 갈릴 수 있는 쟁점을 정하세요</li>
                    <li>학생이 근거를 비교하기 쉬운 주제가 좋아요</li>
                    <li>교과와 연결되면 학습 효과가 커집니다</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 2 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 2 · 4</span>
                  <label htmlFor="proPersona">찬성 측 페르소나 (최대 100자)</label>
                  <textarea
                    id="proPersona"
                    maxLength={100}
                    placeholder="예: 효율성을 중시하는 교육 전문가"
                    value={proPersona}
                    onChange={(e) => setProPersona(e.target.value)}
                    disabled={generating}
                  />
                  <label htmlFor="conPersona" style={{ marginTop: 16 }}>
                    반대 측 페르소나 (최대 100자)
                  </label>
                  <textarea
                    id="conPersona"
                    maxLength={100}
                    placeholder="예: 개인정보를 우려하는 인권 전문가"
                    value={conPersona}
                    onChange={(e) => setConPersona(e.target.value)}
                    disabled={generating}
                  />
                </div>
                <aside className="teacher-aside">
                  <strong>페르소나 작성 가이드</strong>
                  <ul>
                    <li>과목·직업 특성을 구체적으로 적어주세요</li>
                    <li>양측이 서로 다른 관점을 갖도록 설정하세요</li>
                    <li>AI는 설득을 위해 과장된 근거를 섞을 수 있습니다</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 3 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 3 · 4</span>
                  <span className="field-label">토론 생성</span>
                  <div className="teacher-preview-box" style={{ marginTop: 12, marginBottom: 0 }}>
                    <p className="teacher-preview-label">출제 요약</p>
                    <dl className="teacher-preview-summary">
                      <div>
                        <dt>학급</dt>
                        <dd>{classLabel}</dd>
                      </div>
                      <div>
                        <dt>교과</dt>
                        <dd>{subjectLabel}</dd>
                      </div>
                      <div>
                        <dt>마감</dt>
                        <dd>{dueAt ? formatDueAt(localDateTimeToIso(dueAt)) : '—'}</dd>
                      </div>
                      <div className="full">
                        <dt>토론 주제</dt>
                        <dd>{topic.trim() || '—'}</dd>
                      </div>
                      <div className="full">
                        <dt>찬성 페르소나</dt>
                        <dd>{proPersona.trim() || '—'}</dd>
                      </div>
                      <div className="full">
                        <dt>반대 페르소나</dt>
                        <dd>{conPersona.trim() || '—'}</dd>
                      </div>
                    </dl>
                    <p className="field-hint" style={{ marginTop: 14 }}>
                      약 50~80초 걸릴 수 있습니다.
                    </p>
                  </div>
                </div>
                <aside className="teacher-aside">
                  <strong>토론 구조</strong>
                  <ul>
                    <li>찬성 입론 → 반대 입론 → 반대 반론 → 찬성 반론 → 최종 변론</li>
                    <li>전체 토론에 검증이 필요한 근거 2~3개와 정상 근거 4개 이상이 함께 포함됩니다</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 4 && previewDebate && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 4 · 4</span>
                  <span className="field-label">근거 오류 미리보기</span>
                  {previewReused && (
                    <p className="field-hint" style={{ marginTop: 0, marginBottom: 12 }}>
                      이전에 생성한 토론 미리보기입니다.
                    </p>
                  )}
                  {flawItems.length === 0 ? (
                    <p className="field-hint">팩트체커가 문제 삼은 근거를 찾지 못했습니다.</p>
                  ) : (
                    <div className="teacher-flaw-list">
                      {flawItems.map((item, index) => (
                        <article key={`${item.turnId}-${index}`} className="teacher-flaw-item">
                          <div className="teacher-flaw-head">
                            <span className={`teacher-flaw-side ${item.side}`}>
                              {item.side === 'pro' ? '찬성' : '반대'}
                            </span>
                            <span className="teacher-flaw-round">{item.round}</span>
                            <span className={`teacher-flaw-verdict ${item.verdict}`}>
                              {VERDICT_LABEL[item.verdict] || item.verdict}
                            </span>
                          </div>
                          <p className="teacher-flaw-claim">{item.claim}</p>
                          <p className="teacher-flaw-reason">{item.reason || '판정 사유 없음'}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                <aside className="teacher-aside">
                  <strong>미리보기 안내</strong>
                  <ul>
                    <li>학생에게는 처음에 판정이 숨겨집니다</li>
                    <li>과장·근거 부족·사실 오류 유형을 미리 확인하세요</li>
                    <li>게시 후 학생은 같은 토론 내용을 듣게 됩니다</li>
                  </ul>
                </aside>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}

            <div className="teacher-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={step === 1 || generating}
                onClick={() => {
                  setError('');
                  setStep((s) => s - 1);
                }}
              >
                이전
              </button>
              {step < 3 && (
                <button type="button" className="btn btn-primary" disabled={generating} onClick={handleNext}>
                  다음
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={generating}
                  onClick={() => void generatePreview()}
                >
                  {generating ? '토론 생성 중…' : '토론 생성'}
                </button>
              )}
              {step === 4 && (
                <button type="button" className="btn btn-primary" onClick={finishPublish}>
                  게시 완료
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
