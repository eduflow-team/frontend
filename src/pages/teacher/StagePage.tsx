import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ApiError,
  createTeacherAssignmentStep1Api,
  fetchClassesApi,
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
  '1': '학습 문서와 퀴즈 문제·정답을 등록하면 학생이 RAG로 답을 찾아보는 활동을 시작할 수 있습니다.',
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
const REFERENCE_ACCEPT = '.pdf,.txt,.md,.markdown';

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
  const [answer, setAnswer] = useState('');
  const [dueAt, setDueAt] = useState(defaultDueAtLocal);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [tourOpen, setTourOpen] = useState(true);

  useEffect(() => {
    fetchClassesApi()
      .then((res) => {
        setClasses(res.classes);
        if (res.classes[0]) setClassId(res.classes[0].class_id);
      })
      .catch(() => setClasses([]));
  }, []);

  const validateStep = () => {
    if (step === 1 && !file) return '학습 문서를 업로드해 주세요.';
    if (step === 2) {
      if (!question.trim()) return '문제를 입력해 주세요.';
      if (!answer.trim()) return '정답을 입력해 주세요.';
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
    if (!question.trim() || !answer.trim()) {
      setError('문제와 정답을 입력해 주세요.');
      return;
    }
    if (!dueAt) {
      setError('마감일을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createTeacherAssignmentStep1Api({
        class_id: Number(classId),
        subject,
        question: question.trim(),
        answer: answer.trim(),
        due_at: localDateTimeToIso(dueAt),
        file,
      });
      navigate('/teacher', {
        replace: true,
        state: { flashSuccess: '과제 출제 완료' },
      });
    } catch (err) {
      const formatted = formatStage1CreateError(err);
      setError(formatted.message);
      setCanRetry(formatted.canRetry);
    } finally {
      setSubmitting(false);
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
          학습 문서와 퀴즈 문제·정답을 등록하면 학생이 RAG로 답을 찾아보는 활동을 시작할 수 있습니다.
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
              <label htmlFor="s1-doc-file">학습 문서</label>
              <div className="teacher-file-upload" data-tour="t1-tour-file">
                <input
                  id="s1-doc-file"
                  key={fileInputKey}
                  type="file"
                  accept={REFERENCE_ACCEPT}
                  className="teacher-file-input"
                  disabled={submitting}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setError('');
                    setCanRetry(false);
                  }}
                />
                <div className="teacher-file-drop">
                  <p className="teacher-file-title">PDF 교과 자료를 업로드하세요</p>
                  <p className="teacher-file-hint">PDF 권장 · TXT·MD도 가능</p>
                  <label htmlFor="s1-doc-file" className="btn btn-ghost btn-sm teacher-file-btn">
                    파일 선택
                  </label>
                </div>
                {file && (
                  <div className="teacher-file-selected">
                    <strong>{file.name}</strong>
                    <span>{(file.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      className="teacher-file-remove"
                      disabled={submitting}
                      onClick={() => {
                        setFile(null);
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
                rows={4}
                required
                placeholder="퀴즈 문제 1개"
                value={question}
                disabled={submitting}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <label htmlFor="s1-answer" className="teacher-field-spaced" data-tour="t1-tour-answer">
                정답
              </label>
              <input
                id="s1-answer"
                required
                placeholder="채점용 정답 1개"
                value={answer}
                disabled={submitting}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>
            <aside className="teacher-aside">
              <strong>문제·정답 작성 가이드</strong>
              <ul>
                <li>학습 문서 범위에서 답을 찾을 수 있는 문제로 작성하세요</li>
                <li>정답은 채점용으로 교과서 표현을 사용하세요</li>
                <li>마감 전까지 학생에게 정답은 보이지 않습니다</li>
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
              {submitting ? '업로드 중…' : '과제 만들기'}
            </button>
          )}
        </div>
      </div>

      <TeacherStage1Tour open={tourOpen} onFinish={() => setTourOpen(false)} />
    </div>
  );
}
