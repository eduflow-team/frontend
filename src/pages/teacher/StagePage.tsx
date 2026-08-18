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
  '1': '학습 자료와 퀴즈 1문제·정답을 등록합니다.',
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
        <div className="shell">
          <h1 className="page-title">{learningModeByStage(1)?.module ?? 'RAG 체험'}</h1>
          <p className="page-desc">{STAGE_DESCRIPTIONS['1']}</p>
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

function TeacherStage1Form() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [subject, setSubject] = useState('hist');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [dueAt, setDueAt] = useState(defaultDueAtLocal);
  const [file, setFile] = useState<File | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await uploadAssignment();
  };

  return (
    <div className="s1">
      <div className="shell">
        <h1 className="page-title">{learningModeByStage(1)?.module ?? 'RAG 체험'}</h1>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="row-2" data-tour="t1-tour-class">
            <div className="field-group">
              <label className="label" htmlFor="s1-class">
                학급
              </label>
              <select
                id="s1-class"
                className="field"
                value={classId}
                onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">선택</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {formatClassLabel(c.grade, c.class_number)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="label" htmlFor="s1-subject">
                교과
              </label>
              <select
                id="s1-subject"
                className="field"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-group" data-tour="t1-tour-question">
            <label className="label" htmlFor="s1-question">
              문제
            </label>
            <textarea
              id="s1-question"
              className="field"
              rows={3}
              required
              placeholder="퀴즈 문제 1개"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="field-group" data-tour="t1-tour-answer">
            <label className="label" htmlFor="s1-answer">
              정답
            </label>
            <input
              id="s1-answer"
              className="field"
              required
              placeholder="채점용 정답 1개"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>

          <div className="field-group" style={{ maxWidth: 320 }} data-tour="t1-tour-due">
            <label className="label" htmlFor="s1-due">
              마감일
            </label>
            <input
              id="s1-due"
              className="field"
              type="datetime-local"
              required
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div className="field-group" data-tour="t1-tour-file">
            <label className="label" htmlFor="s1-file">
              학습 문서
            </label>
            <input
              id="s1-file"
              className="field"
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError('');
                setCanRetry(false);
              }}
            />
          </div>

          {error && (
            <div className="hint" role="alert" style={{ color: '#b91c1c' }}>
              <p style={{ margin: 0 }}>{error}</p>
              {canRetry && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: 10 }}
                  disabled={submitting || !file}
                  onClick={() => void uploadAssignment()}
                >
                  {submitting ? '재시도 중…' : '다시 시도'}
                </button>
              )}
            </div>
          )}

          <div className="actions" data-tour="t1-tour-submit">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '업로드 중…' : '과제 만들기'}
            </button>
          </div>
        </form>
      </div>

      <TeacherStage1Tour open={tourOpen} onFinish={() => setTourOpen(false)} />
    </div>
  );
}
