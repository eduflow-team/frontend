import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ApiError,
  createTeacherAssignmentStep1Api,
  createTeacherAssignmentStep2Api,
  fetchClassesApi,
} from '../../api';
import type { ClassItem, HallucinationType, Stage2CreateResponse } from '../../api/types';
import { STAGE1_CHUNK_SIZE_PRESETS } from '../../api/types';
import { PageHero, PlaceholderCard } from '../../components/common';
import { HALLUCINATION_LABELS, SUBJECT_OPTIONS } from '../../constants/assignments';
import { useAuth } from '../../contexts/AuthContext';
import { defaultDueAtLocal, formatDueAt, localDateTimeToIso } from '../../utils/datetime';
import { formatClassLabel } from '../../utils/labels';
import { TeacherStage3Form } from './stage3/TeacherStage3Form';
import { TeacherStage4Form } from './stage4/TeacherStage4Form';

const STAGE_DESCRIPTIONS: Record<string, string> = {
  '1': '학습 자료를 업로드하면 AI가 학생용 문제를 만들고, 가이드라인 질문은 고정됩니다.',
  '2': '참고 문서와 페르소나를 설정해 의도적 환각 과제를 업로드합니다.',
  '3': 'AI 관점 비교 토론 주제를 설정합니다.',
  '4': 'AI 보안 실습 시나리오를 배포합니다.',
};

const HALLUCINATION_OPTIONS: HallucinationType[] = [
  'PERSONA_BIAS',
  'INFORMATION_FABRICATION',
  'RETRIEVAL_ERROR',
];

export function TeacherStagePage() {
  const { stage } = useParams<{ stage: string }>();
  const stageNum = stage ?? '1';
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo && (stageNum === '1' || stageNum === '2'));

  if (stageNum === '3') {
    return <TeacherStage3Form />;
  }

  if (stageNum === '4') {
    return <TeacherStage4Form />;
  }

  if (!useApi) {
    return (
      <>
        <PageHero
          title={`${stageNum}단계 과제 출제`}
          description={STAGE_DESCRIPTIONS[stageNum] ?? ''}
        />
        <PlaceholderCard
          title={`${stageNum}단계 과제 편집 영역`}
          message="실제 로그인 후 백엔드 API와 연결됩니다. 데모가 아닌 계정으로 로그인해 주세요."
        />
      </>
    );
  }

  return stageNum === '1' ? <TeacherStage1Form /> : <TeacherStage2Form />;
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
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [subject, setSubject] = useState('hist');
  const [dueAt, setDueAt] = useState(defaultDueAtLocal);
  const [chunkSize, setChunkSize] = useState(50);
  const [topK, setTopK] = useState(2);
  const [temperature, setTemperature] = useState(1.0);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    fetchClassesApi()
      .then((res) => {
        setClasses(res.classes);
        if (res.classes[0]) setClassId(res.classes[0].class_id);
      })
      .catch(() => setClasses([]));
  }, []);

  const uploadAssignment = async () => {
    setMessage('');
    setError('');
    setCanRetry(false);
    if (classId === '' || !file) {
      setError('학급과 파일을 입력해 주세요.');
      return;
    }
    if (!dueAt) {
      setError('마감일을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createTeacherAssignmentStep1Api({
        class_id: Number(classId),
        subject,
        due_at: localDateTimeToIso(dueAt),
        default_chunk_size: chunkSize,
        default_top_k: topK,
        default_temperature: temperature,
        file,
      });
      setMessage(
        `과제가 업로드되었습니다. (assignment_id: ${res.assignment_id})\n` +
          `마감: ${formatDueAt(res.due_at) || formatDueAt(localDateTimeToIso(dueAt))}\n` +
          `생성된 문제: ${res.question}\n` +
          `가이드라인: ${res.guideline}`,
      );
      setCanRetry(false);
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
    <>
      <PageHero title="1단계 과제 출제" description={STAGE_DESCRIPTIONS['1']} />
      <div className="card">
        <div className="card-header">
          <span className="card-title">1단계 · 답 실험 업로드</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 14, lineHeight: 1.5 }}>
              학습 자료를 업로드하면 AI가 학생용 문제를 만들고, 가이드라인은
              &quot;오늘 학습 주제의 내용을 전체적으로 알려줘&quot;로 고정됩니다.
            </p>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="s1-class">
                  학급
                </label>
                <select
                  id="s1-class"
                  className="form-control"
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
              <div className="form-group">
                <label className="form-label" htmlFor="s1-subject">
                  교과
                </label>
                <select
                  id="s1-subject"
                  className="form-control"
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
            <div className="form-group" style={{ maxWidth: 320 }}>
              <label className="form-label" htmlFor="s1-due">
                마감일
              </label>
              <input
                id="s1-due"
                className="form-control"
                type="datetime-local"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="s1-chunk">
                  기본 chunk_size
                </label>
                <select
                  id="s1-chunk"
                  className="form-control"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                >
                  {STAGE1_CHUNK_SIZE_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="s1-topk">
                  기본 top_k
                </label>
                <input
                  id="s1-topk"
                  className="form-control"
                  type="number"
                  min={1}
                  max={50}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="s1-temp">
                  기본 temperature
                </label>
                <input
                  id="s1-temp"
                  className="form-control"
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="s1-file">
                학습 문서 (pdf / txt / md, 최대 10MB)
              </label>
              <input
                id="s1-file"
                className="form-control"
                type="file"
                accept=".pdf,.txt,.md,.markdown"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError('');
                  setCanRetry(false);
                  setMessage('');
                }}
              />
            </div>
            {error && (
              <div className="inline-alert error" role="alert">
                <p style={{ margin: 0 }}>{error}</p>
                {canRetry && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 10 }}
                    disabled={submitting || !file}
                    onClick={() => void uploadAssignment()}
                  >
                    {submitting ? '재시도 중…' : '다시 시도'}
                  </button>
                )}
              </div>
            )}
            {message && (
              <p className="inline-alert ok" style={{ whiteSpace: 'pre-wrap' }}>
                {message}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-cta" disabled={submitting}>
              {submitting ? '문서 임베딩·업로드 중…' : '업로드하기'}
            </button>
            {submitting && (
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>
                문서 청크를 여러 preset으로 임베딩하는 중이라 최대 1~2분 걸릴 수 있습니다.
              </p>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

function TeacherStage2Form() {
  const [title, setTitle] = useState('2단계: 의도적 환각 비판적 검증 (장영실 편)');
  const [subject, setSubject] = useState('hist');
  const [question, setQuestion] = useState('장영실의 발명품에 대해 설명해줘.');
  const [persona, setPersona] = useState(
    '장영실이 연을 만들었다고 믿고, 자격루를 서양 기술이라고 주장하는 선생님',
  );
  const [dueAt, setDueAt] = useState(defaultDueAtLocal);
  const [types, setTypes] = useState<HallucinationType[]>([
    'PERSONA_BIAS',
    'RETRIEVAL_ERROR',
  ]);
  const [errorCount, setErrorCount] = useState(2);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Stage2CreateResponse | null>(null);

  const toggleType = (t: HallucinationType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setPreview(null);
    if (!title.trim() || !question.trim() || !persona.trim() || !types.length || !file) {
      setError('제목, 질문, 페르소나, 환각 유형, 파일을 모두 입력해 주세요.');
      return;
    }
    if (!dueAt) {
      setError('마감일을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createTeacherAssignmentStep2Api({
        title: title.trim(),
        subject,
        question: question.trim(),
        persona: persona.trim().slice(0, 100),
        due_at: localDateTimeToIso(dueAt),
        hallucination_types: types,
        expected_error_count: errorCount,
        file,
      });
      setPreview(res);
      setMessage(
        `과제가 업로드되었습니다. (assignment_id: ${res.assignment_id})` +
          ` · 마감 ${formatDueAt(res.due_at) || formatDueAt(localDateTimeToIso(dueAt))}`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero title="2단계 과제 출제" description={STAGE_DESCRIPTIONS['2']} />
      <div className="card">
        <div className="card-header">
          <span className="card-title">2단계 · 틀린 말 찾기 업로드</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="s2-title">
                제목
              </label>
              <input
                id="s2-title"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="s2-subject">
                교과
              </label>
              <select
                id="s2-subject"
                className="form-control"
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
            <div className="form-group" style={{ maxWidth: 320 }}>
              <label className="form-label" htmlFor="s2-due">
                마감일
              </label>
              <input
                id="s2-due"
                className="form-control"
                type="datetime-local"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="s2-question">
                질문
              </label>
              <input
                id="s2-question"
                className="form-control"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="s2-persona">
                페르소나 (최대 100자)
              </label>
              <textarea
                id="s2-persona"
                className="form-control"
                rows={2}
                maxLength={100}
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
              />
            </div>
            <div className="form-group">
              <span className="form-label">환각 유형</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                {HALLUCINATION_OPTIONS.map((t) => (
                  <label key={t} style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() => toggleType(t)}
                    />
                    {HALLUCINATION_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label" htmlFor="s2-count">
                찾을 오류 개수 (1~5)
              </label>
              <input
                id="s2-count"
                className="form-control"
                type="number"
                min={1}
                max={5}
                value={errorCount}
                onChange={(e) => setErrorCount(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="s2-file">
                참고 문서 (pdf / txt / md)
              </label>
              <input
                id="s2-file"
                className="form-control"
                type="file"
                accept=".pdf,.txt,.md,.markdown"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="inline-alert error">{error}</p>}
            {message && <p className="inline-alert ok">{message}</p>}
            <button type="submit" className="btn btn-primary btn-cta" disabled={submitting}>
              {submitting ? '생성 중…' : '업로드하기'}
            </button>
          </form>
        </div>
      </div>

      {preview && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">교사 미리보기 (학생에게는 비공개)</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
              <strong>AI 오답:</strong> {preview.flawed_ai_response}
            </p>
            {preview.generated_errors.map((err) => (
              <div
                key={err.answer_id}
                style={{
                  padding: '10px 0',
                  borderTop: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {HALLUCINATION_LABELS[err.error_type] ?? err.error_type}
                </div>
                <div style={{ marginTop: 4 }}>{err.error_sentence}</div>
                <div style={{ color: 'var(--gray-500)', marginTop: 4 }}>
                  정답 예: {err.correct_sentence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
