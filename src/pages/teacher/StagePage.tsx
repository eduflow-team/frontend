import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ApiError,
  createTeacherAssignmentStep1Api,
  fetchTeacherClassesApi,
} from '../../api';
import type { ClassItem } from '../../api/types';
import { SUBJECT_OPTIONS } from '../../constants/assignments';
import { learningModeByStage } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { TeacherStage1Tour } from '../../components/teacher/TeacherStage1Tour';
import { defaultDueAtLocal, localDateTimeToIso } from '../../utils/datetime';
import { formatClassLabel } from '../../utils/labels';
import { TeacherStage2Form } from './stage2/TeacherStage2Form';
import { TeacherStage3Form } from './stage3/TeacherStage3Form';
import { TeacherStage4Form } from './stage4/TeacherStage4Form';

const STAGE_DESCRIPTIONS: Record<string, string> = {
  '1': '학습 자료와 서술형 문제·정답 키포인트 3개를 등록하면 학생이 RAG로 답을 찾아보는 활동을 시작할 수 있습니다.',
  '2': '참고 문서와 페르소나를 설정해 의도적 환각 과제를 만듭니다.',
  '3': 'AI 관점 비교 토론 주제를 설정합니다.',
  '4': 'AI 보안 실습 과제를 게시합니다.',
};

export function TeacherStagePage() {
  const { stage } = useParams<{ stage: string }>();
  const stageNum = stage ?? '1';
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo && stageNum === '1');

  if (stageNum === '2') {
    return <TeacherStage2Form />;
  }

  if (stageNum === '3') {
    return <TeacherStage3Form />;
  }

  if (stageNum === '4') {
    return <TeacherStage4Form />;
  }

  if (!useApi) {
    return (
      <div className="s1">
        <div className="shell teacher-shell">
          <nav className="steps teacher-flow-steps" aria-label="진행 단계">
            <div className="step" aria-current="step">
              과제 만들기
            </div>
            <div className="step">학생 학습</div>
            <div className="step">결과 확인</div>
          </nav>
          <h1 className="page-title">{learningModeByStage(1)?.module ?? 'RAG 체험'}</h1>
          <p className="page-desc">{STAGE_DESCRIPTIONS['1']}</p>
          <div className="teacher-meta-row">
            <div className="teacher-meta-field">
              <label className="label" htmlFor="s1-demo-class">
                학급 선택
              </label>
              <select id="s1-demo-class" className="field" disabled>
                <option>학급 선택</option>
              </select>
            </div>
            <div className="teacher-meta-field">
              <label className="label" htmlFor="s1-demo-subject">
                담당 교과
              </label>
              <select id="s1-demo-subject" className="field" disabled defaultValue="hist">
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="teacher-meta-field">
              <label className="label" htmlFor="s1-demo-due">
                과제 마감일
              </label>
              <input id="s1-demo-due" className="field" type="datetime-local" disabled />
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">RAG 체험 과제 편집</p>
            </div>
            <p className="mission-text">
              실제 로그인 후 백엔드 API와 연결됩니다. 데모가 아닌 계정으로 로그인해 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <TeacherStage1Form />;
}

function formatStage1CreateError(err: unknown): { message: string; canRetry: boolean } {
  if (!(err instanceof ApiError)) {
    return {
      message: '업로드에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      canRetry: true,
    };
  }

  const detail = err.message;
  const isMissingKey = detail.includes('OPENAI_API_KEY');
  const isEmbedFailure =
    err.status === 500 ||
    detail.includes('임베딩') ||
    detail.includes('청크 분할') ||
    detail.includes('벡터');

  if (isMissingKey) {
    return {
      message:
        '문서 임베딩에 필요한 OPENAI_API_KEY가 백엔드에 없습니다. 백엔드 .env 설정을 확인해 주세요.',
      canRetry: false,
    };
  }

  if (isEmbedFailure) {
    return {
      message:
        '문서 임베딩 처리에 실패했습니다. OpenAI 호출이 일시적으로 실패했거나 서버가 재시작 중일 수 있습니다. 잠시 후 다시 시도해 주세요.',
      canRetry: true,
    };
  }

  if (err.status === 400) {
    return {
      message: detail || '입력값을 확인해 주세요. (파일 형식·크기·파라미터)',
      canRetry: false,
    };
  }

  if (err.status === 401 || err.status === 403) {
    return {
      message: detail || '권한이 없거나 로그인이 만료되었습니다. 다시 로그인해 주세요.',
      canRetry: false,
    };
  }

  return {
    message: detail || '업로드에 실패했습니다.',
    canRetry: err.status >= 500 || err.status === 0,
  };
}

const STAGE1_STEP_LABELS = ['학습 문서', '문제·정답'] as const;
const STAGE1_DOC_ACCEPT = '.pdf,.txt,.md,.markdown';
const STAGE1_DOC_ACCEPT_SET = new Set(['pdf', 'txt', 'md', 'markdown']);

function stage1DocExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function isStage1DocFile(file: File): boolean {
  return STAGE1_DOC_ACCEPT_SET.has(stage1DocExt(file.name));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STAGE1_CREATE_STEPS = [
  { id: 'upload', label: '문서 업로드', until: 12 },
  { id: 'extract', label: '텍스트 추출', until: 30 },
  { id: 'embed', label: '청크 분할 · 임베딩', until: 94 },
  { id: 'save', label: '과제 저장', until: 100 },
] as const;

function createStepIndex(percent: number): number {
  const idx = STAGE1_CREATE_STEPS.findIndex((s) => percent < s.until);
  return idx === -1 ? STAGE1_CREATE_STEPS.length - 1 : idx;
}

function Stage1StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="teacher-steps">
      {STAGE1_STEP_LABELS.map((label, index) => {
        const n = index + 1;
        const done = n < currentStep;
        const isActive = n === currentStep;
        return (
          <div key={label} className="teacher-step-row">
            <div className="teacher-step-item">
              <span className={`teacher-step-circle${done ? ' done' : ''}${isActive ? ' active' : ''}`}>
                {done ? '✓' : n}
              </span>
              <span className={`teacher-step-label${isActive ? ' active' : ''}`}>{label}</span>
            </div>
            {index < STAGE1_STEP_LABELS.length - 1 && (
              <div className={`teacher-step-line${n < currentStep ? ' done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeacherStage1Form() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [subject, setSubject] = useState('hist');
  const [question, setQuestion] = useState('');
  const [keypoints, setKeypoints] = useState<[string, string, string]>(['', '', '']);
  const [dueAt, setDueAt] = useState(defaultDueAtLocal);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createDone, setCreateDone] = useState(false);
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [tourOpen, setTourOpen] = useState(true);

  const pickDocFile = (next: File | null) => {
    if (next && !isStage1DocFile(next)) {
      setError('PDF, TXT, MD 파일만 업로드할 수 있습니다.');
      setCanRetry(false);
      return;
    }
    setFile(next);
    setError('');
    setCanRetry(false);
  };

  const clearDocFile = () => {
    setFile(null);
    setFileInputKey((k) => k + 1);
    setError('');
    setCanRetry(false);
  };

  useEffect(() => {
    fetchTeacherClassesApi()
      .then((res) => {
        setClasses(res.classes);
        if (res.classes[0]) setClassId(res.classes[0].class_id);
      })
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!submitting || createDone) return;
    const timer = window.setInterval(() => {
      setCreateProgress((prev) => {
        if (prev >= 92) return prev;
        const remaining = 92 - prev;
        const delta = prev < 28 ? 2.4 : prev < 55 ? 1.1 : Math.max(0.25, remaining * 0.035);
        return Math.min(92, prev + delta);
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [submitting, createDone]);

  const validateStep = () => {
    if (step === 1 && !file) return '학습 문서를 업로드해 주세요.';
    if (step === 2) {
      if (!question.trim()) return '문제를 입력해 주세요.';
      if (keypoints.some((k) => !k.trim())) return '정답 키포인트 3개를 모두 입력해 주세요.';
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
    setCanRetry(false);
    if (step < 2) setStep(2);
  };

  const uploadAssignment = async () => {
    setError('');
    setCanRetry(false);
    if (classId === '' || !file) {
      setError('학급과 파일을 입력해 주세요.');
      return;
    }
    if (!question.trim()) {
      setError('문제를 입력해 주세요.');
      return;
    }
    const cleanedKeypoints = keypoints.map((k) => k.trim());
    if (cleanedKeypoints.some((k) => !k)) {
      setError('정답 키포인트 3개를 모두 입력해 주세요.');
      return;
    }
    if (!dueAt) {
      setError('마감일을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setCreateDone(false);
    setCreateProgress(4);
    try {
      await createTeacherAssignmentStep1Api({
        class_id: Number(classId),
        subject,
        question: question.trim(),
        answer_keypoints: cleanedKeypoints,
        due_at: localDateTimeToIso(dueAt),
        file,
      });
      setCreateDone(true);
      setCreateProgress(100);
      await new Promise((r) => window.setTimeout(r, 550));
      navigate('/teacher', {
        replace: true,
        state: { flashSuccess: '과제 출제 완료' },
      });
    } catch (err) {
      const formatted = formatStage1CreateError(err);
      setError(formatted.message);
      setCanRetry(formatted.canRetry);
      setSubmitting(false);
      setCreateDone(false);
      setCreateProgress(0);
    }
  };

  const handleSubmit = async () => {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    await uploadAssignment();
  };

  const activeStep = createStepIndex(createProgress);
  const progressLabel = createDone
    ? '과제 출제 완료'
    : STAGE1_CREATE_STEPS[activeStep]?.label ?? '처리 중';

  return (
    <div className="s1">
      <div className="shell teacher-shell">
        <nav className="steps teacher-flow-steps" aria-label="진행 단계">
          <div className="step" aria-current="step">
            과제 만들기
          </div>
          <div className="step">학생 학습</div>
          <div className="step">결과 확인</div>
        </nav>

        <h1 className="page-title">{learningModeByStage(1)?.module ?? 'RAG 체험'}</h1>
        <p className="page-desc">
          학습 자료와 서술형 문제·정답 키포인트 3개를 등록하면 학생이 RAG로 답을 찾아보는 활동을 시작할 수
          있습니다.
        </p>

        <div className="teacher-meta-row">
          <div className="teacher-meta-field" data-tour="t1-tour-class">
            <label className="label" htmlFor="s1-class">
              학급 선택
            </label>
            <select
              id="s1-class"
              className="field"
              value={classId}
              onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={submitting}
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
            <label className="label" htmlFor="s1-subject">
              담당 교과
            </label>
            <select
              id="s1-subject"
              className="field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-meta-field" data-tour="t1-tour-due">
            <label className="label" htmlFor="s1-due">
              과제 마감일
            </label>
            <input
              id="s1-due"
              className="field"
              type="datetime-local"
              required
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <Stage1StepIndicator currentStep={step} />

        {step === 1 && (
          <div className="teacher-grid">
            <div className="teacher-card">
              <span className="teacher-step-badge">STEP 1 · 2</span>
              <div className="field-group" data-tour="t1-tour-file">
                <span className="label" id="s1-file-label">
                  학습 문서
                </span>
                <input
                  id="s1-file"
                  key={fileInputKey}
                  className="dropzone-input"
                  type="file"
                  accept={STAGE1_DOC_ACCEPT}
                  disabled={submitting}
                  onChange={(e) => pickDocFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="s1-file"
                  className={`dropzone${file ? ' has-file' : ''}${dragOver ? ' is-dragover' : ''}${submitting ? ' is-disabled' : ''}`}
                  aria-labelledby="s1-file-label"
                  onDragEnter={(e) => {
                    if (submitting) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                  }}
                  onDragOver={(e) => {
                    if (submitting) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);
                    if (submitting) return;
                    pickDocFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  {file ? (
                    <div className="dropzone-selected">
                      <span className="dropzone-ext" aria-hidden="true">
                        {stage1DocExt(file.name).toUpperCase() || 'FILE'}
                      </span>
                      <div className="dropzone-meta">
                        <strong>{file.name}</strong>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="dropzone-remove"
                        disabled={submitting}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          clearDocFile();
                        }}
                      >
                        제거
                      </button>
                    </div>
                  ) : (
                    <>
                      <strong>파일을 여기에 끌어다 놓으세요</strong>
                      <span>PDF 권장 · TXT · MD</span>
                      <span className="dropzone-browse">또는 클릭해서 선택</span>
                    </>
                  )}
                </label>
              </div>
            </div>
            <aside className="teacher-aside">
              <strong>좋은 학습 문서 조건</strong>
              <ul>
                <li>교과 PDF·발췌본을 업로드하세요</li>
                <li>구체적 사실과 연도가 포함되면 좋아요</li>
                <li>학생이 RAG로 탐색할 원문이어야 해요</li>
              </ul>
            </aside>
          </div>
        )}

        {step === 2 && (
          <div className="teacher-grid">
            <div className="teacher-card">
              <span className="teacher-step-badge">STEP 2 · 2</span>
              <label htmlFor="s1-question" data-tour="t1-tour-question">
                문제
              </label>
              <textarea
                id="s1-question"
                className="field"
                rows={4}
                required
                placeholder="예: 일제강점기 일본이 한국에 한 행동 3가지를 적으시오."
                value={question}
                disabled={submitting}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <p className="field-note">학생이 근거를 모아 짧게 정리할 서술형 문제로 내 주세요. (핵심 요점 3개)</p>

              <span className="label teacher-field-spaced" id="s1-keypoints-label" data-tour="t1-tour-answer">
                정답 키포인트 3개
              </span>
              <div className="keypoint-fields" role="group" aria-labelledby="s1-keypoints-label">
                {keypoints.map((value, index) => (
                  <div key={`kp-${index}`} className="keypoint-field">
                    <label className="keypoint-index" htmlFor={`s1-keypoint-${index + 1}`}>
                      {index + 1}
                    </label>
                    <input
                      id={`s1-keypoint-${index + 1}`}
                      className="field"
                      required
                      disabled={submitting}
                      placeholder={
                        index === 0
                          ? '예: 토지 조사 사업'
                          : index === 1
                            ? '예: 산미 증식 계획'
                            : '예: 무단 통치'
                      }
                      value={value}
                      onChange={(e) => {
                        const next = [...keypoints] as [string, string, string];
                        next[index] = e.target.value;
                        setKeypoints(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="field-note">
                채점 기준이 되는 핵심 요점 3개입니다. 학생 답안에 이 내용이 포함됐는지로 부분 채점합니다.
              </p>
            </div>
            <aside className="teacher-aside">
              <strong>문제·키포인트 작성 가이드</strong>
              <ul>
                <li>학습 문서 범위에서 근거를 모아 쓸 수 있는 서술형 문제로 작성하세요</li>
                <li>채점용 핵심 요점 3개를 짧게·객관적으로 적어 주세요</li>
                <li>마감 전까지 학생에게 키포인트는 보이지 않습니다</li>
              </ul>
            </aside>
          </div>
        )}

        {error && (
          <div className="form-error-wrap" role="alert">
            <p className="form-error">{error}</p>
            {canRetry && step === 2 && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={submitting || !file}
                onClick={() => void uploadAssignment()}
              >
                {submitting ? '재시도 중…' : '다시 시도'}
              </button>
            )}
          </div>
        )}

        <div className="teacher-actions" data-tour="t1-tour-submit">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={step === 1 || submitting}
            onClick={() => {
              setError('');
              setCanRetry(false);
              setStep(1);
            }}
          >
            이전
          </button>
          {step === 1 ? (
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleNext}>
              다음
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? '생성 중…' : '과제 만들기'}
            </button>
          )}
        </div>
      </div>

      {submitting && (
        <div className="create-progress" role="status" aria-live="polite" aria-busy={!createDone}>
          <div className="create-progress-card">
            <p className="create-progress-kicker">{createDone ? '완료' : '과제 생성 중'}</p>
            <p className="create-progress-title">{progressLabel}</p>
            <div className="create-progress-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(createProgress)}%` }} />
            </div>
            <p className="create-progress-pct">{Math.round(createProgress)}%</p>
            <ol className="create-progress-steps">
              {STAGE1_CREATE_STEPS.map((createStep, index) => {
                const state =
                  createDone || index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending';
                return (
                  <li key={createStep.id} className={`create-progress-step is-${state}`}>
                    <span className="create-progress-dot" aria-hidden="true">
                      {state === 'done' ? '✓' : index + 1}
                    </span>
                    <span>{createStep.label}</span>
                  </li>
                );
              })}
            </ol>
            <p className="create-progress-hint">
              문서가 길거나 이미지 PDF면 임베딩에 1~2분 걸릴 수 있어요. 창을 닫지 마세요.
            </p>
          </div>
        </div>
      )}

      <TeacherStage1Tour open={tourOpen && !submitting} onFinish={() => setTourOpen(false)} />
    </div>
  );
}
