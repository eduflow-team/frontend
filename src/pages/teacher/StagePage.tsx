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
import { formatClassLabel } from '../../utils/labels';

const STAGE_DESCRIPTIONS: Record<string, string> = {
  '1': '문서를 업로드하고 파라미터 기본값을 설정해 1단계 과제를 업로드합니다.',
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
  const useApi = user && !user.isDemo && (stageNum === '1' || stageNum === '2');

  if (!useApi) {
    return (
      <>
        <PageHero
          title={`${stageNum}단계 과제 출제`}
          description={STAGE_DESCRIPTIONS[stageNum] ?? ''}
        />
        <PlaceholderCard
          title={`${stageNum}단계 과제 편집 영역`}
          message={
            stageNum === '3' || stageNum === '4'
              ? '3·4단계 API는 백엔드에 아직 없습니다.'
              : '데모 모드에서는 과제 업로드 API를 호출하지 않습니다.'
          }
        />
      </>
    );
  }

  return stageNum === '1' ? <TeacherStage1Form /> : <TeacherStage2Form />;
}

function TeacherStage1Form() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [subject, setSubject] = useState('hist');
  const [question, setQuestion] = useState(
    '조선 시대 장영실의 업적에 대해 AI에게 질문하고, 파라미터를 조절하여 가장 좋은 답변을 찾아보세요.',
  );
  const [guideline, setGuideline] = useState(
    '"조선 시대 장영실에 대해서 알려줘"라고 AI에게 질문해보세요.',
  );
  const [chunkSize, setChunkSize] = useState(200);
  const [topK, setTopK] = useState(2);
  const [temperature, setTemperature] = useState(0.9);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClassesApi()
      .then((res) => {
        setClasses(res.classes);
        if (res.classes[0]) setClassId(res.classes[0].class_id);
      })
      .catch(() => setClasses([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (classId === '' || !question.trim() || !guideline.trim() || !file) {
      setError('학급, 문제, 가이드라인, 파일을 모두 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createTeacherAssignmentStep1Api({
        class_id: Number(classId),
        subject,
        question: question.trim(),
        guideline: guideline.trim(),
        default_chunk_size: chunkSize,
        default_top_k: topK,
        default_temperature: temperature,
        file,
      });
      setMessage(`과제가 업로드되었습니다. (assignment_id: ${res.assignment_id})`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
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
            <div className="form-group">
              <label className="form-label" htmlFor="s1-question">
                문제
              </label>
              <textarea
                id="s1-question"
                className="form-control"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="s1-guideline">
                가이드라인
              </label>
              <textarea
                id="s1-guideline"
                className="form-control"
                rows={2}
                value={guideline}
                onChange={(e) => setGuideline(e.target.value)}
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
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="inline-alert error">{error}</p>}
            {message && <p className="inline-alert ok">{message}</p>}
            <button type="submit" className="btn btn-primary btn-cta" disabled={submitting}>
              {submitting ? '업로드 중…' : '업로드하기'}
            </button>
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
    setSubmitting(true);
    try {
      const res = await createTeacherAssignmentStep2Api({
        title: title.trim(),
        subject,
        question: question.trim(),
        persona: persona.trim().slice(0, 100),
        hallucination_types: types,
        expected_error_count: errorCount,
        file,
      });
      setPreview(res);
      setMessage(`과제가 업로드되었습니다. (assignment_id: ${res.assignment_id})`);
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
