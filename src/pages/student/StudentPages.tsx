import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  fetchStudentAttendanceApi,
  fetchStudentDashboardAssignmentsApi,
  fetchStudentNoticesApi,
  fetchStudentRecordsApi,
  getStudentStep1Api,
  postStudentStep1ChatApi,
  postStudentStep1SubmitApi,
} from '../../api';
import type {
  Stage1AssignmentDetailResponse,
  Stage1Parameters,
  Stage1SubmitResponse,
} from '../../api/types';
import { STAGE1_CHUNK_SIZE_PRESETS } from '../../api/types';
import { ApiStateBody, PageHero, PlaceholderCard } from '../../components/common';
import { STAGE_TITLES, STUDENT_SUBJECTS } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import type { SubjectKey } from '../../types';
import { PROGRESS_LABELS } from '../../utils/labels';
import { StudentStage2Activity } from './stage2/StudentStage2Activity';
import { StudentStage3Activity } from './stage3/StudentStage3Activity';
import { StudentStage4Activity } from './stage4/StudentStage4Activity';

export function StudentStagePage() {
  const { subject, stage } = useParams<{ subject: SubjectKey; stage: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const subjectData = STUDENT_SUBJECTS.find((s) => s.key === subject);
  const stageNum = Number(stage);
  const activity = subjectData?.activities.find((a) => a.stage === stageNum);
  const useStageApi = Boolean(user && !user.isDemo && (stageNum === 1 || stageNum === 2));

  const assignmentIdParam = searchParams.get('assignmentId');
  const [assignmentIdInput, setAssignmentIdInput] = useState(assignmentIdParam ?? '');
  const [activeId, setActiveId] = useState<string | null>(assignmentIdParam);

  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], useStageApi);

  useEffect(() => {
    if (assignmentIdParam) {
      setActiveId(assignmentIdParam);
      setAssignmentIdInput(assignmentIdParam);
    }
  }, [assignmentIdParam]);

  if (!subjectData || !activity || Number.isNaN(stageNum) || stageNum < 1 || stageNum > 4) {
    return <Navigate to="/student" replace />;
  }

  if (stageNum === 3) {
    return <StudentStage3Activity />;
  }

  if (stageNum === 4) {
    return <StudentStage4Activity />;
  }

  if (!useStageApi) {
    return (
      <>
        <PageHero
          title={activity.title}
          description={`${subjectData.name} · ${STAGE_TITLES[stageNum]}`}
        />
        <PlaceholderCard
          title={`${stageNum}단계 학습 활동`}
          message={
            stageNum === 1 || stageNum === 2
              ? `${stageNum}단계는 실제 로그인 후 백엔드 API와 연결됩니다. 데모가 아닌 계정으로 로그인해 주세요.`
              : '해당 단계 API는 백엔드에 아직 없습니다.'
          }
        />
      </>
    );
  }

  const selectAssignment = (id: string) => {
    setActiveId(id);
    setAssignmentIdInput(id);
    setSearchParams({ assignmentId: id });
  };

  /* Stage 1 — API 연동 */
  if (stageNum === 1) {
    return (
      <div className="s1">
        <div className="shell wide">
          <nav className="steps" aria-label="진행 단계">
            <div className="step">자료 올리기</div>
            <div className="step" aria-current="step">
              학생 실험
            </div>
            <div className="step">제출·점수</div>
          </nav>

          {!activeId && (
            <>
              <h1 className="page-title">과제 선택</h1>
              <p className="page-desc">
                {subjectData.name} · {STAGE_TITLES[stageNum]} 실험을 시작할 과제를 고르세요.
              </p>
              <div className="stack">
                <ApiStateBody
                  loading={assignments.loading}
                  error={assignments.error}
                  isEmpty={!assignments.data?.assignments.length}
                  emptyMessage="배정된 과제가 없습니다. 과제 ID를 직접 입력할 수 있습니다."
                >
                  <div className="entry-cards">
                    {assignments.data?.assignments
                      .filter((a) => a.stage == null || a.stage === 1)
                      .map((a) => (
                        <button
                          key={a.assignment_id}
                          type="button"
                          className="entry-card"
                          style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                          onClick={() => selectAssignment(String(a.assignment_id))}
                        >
                          <h2>{a.title ?? `과제 #${a.assignment_id}`}</h2>
                          <p>{a.status ? PROGRESS_LABELS[a.status] : '시작하기'}</p>
                        </button>
                      ))}
                  </div>
                </ApiStateBody>
                <div className="field-group" style={{ maxWidth: 320 }}>
                  <label className="label" htmlFor="assignment-id">
                    과제 ID
                  </label>
                  <div className="actions" style={{ paddingTop: 0 }}>
                    <input
                      id="assignment-id"
                      className="field"
                      value={assignmentIdInput}
                      onChange={(e) => setAssignmentIdInput(e.target.value)}
                      placeholder="예: 101"
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (assignmentIdInput.trim()) selectAssignment(assignmentIdInput.trim());
                      }}
                    >
                      열기
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeId && <StudentStage1Activity assignmentId={activeId} />}
        </div>
      </div>
    );
  }

  /* Stage 2 — API 연동 */
  if (stageNum === 2) {
    return (
      <div className="s2">
        {!activeId ? (
          <div className="main-area">
            <div className="container practice-wrap">
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>과제 선택</h1>
              <p className="work-intro-muted" style={{ marginBottom: 16 }}>
                {subjectData.name} · {STAGE_TITLES[stageNum]} 검증 훈련을 시작할 과제를 고르세요.
              </p>
              <ApiStateBody
                loading={assignments.loading}
                error={assignments.error}
                isEmpty={!assignments.data?.assignments.length}
                emptyMessage="배정된 과제가 없습니다. 과제 ID를 직접 입력할 수 있습니다."
              >
                <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                  {assignments.data?.assignments
                    .filter((a) => a.stage == null || a.stage === 2)
                    .map((a) => (
                      <button
                        key={a.assignment_id}
                        type="button"
                        className="btn btn-ghost"
                        style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                        onClick={() => selectAssignment(String(a.assignment_id))}
                      >
                        <span>
                          <strong>{a.title ?? `과제 #${a.assignment_id}`}</strong>
                          <span className="verify-set-meta" style={{ marginLeft: 8 }}>
                            {a.status ? PROGRESS_LABELS[a.status] : '시작하기'}
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              </ApiStateBody>
              <div
                className="find-form"
                style={{ position: 'static', borderTop: '1px solid var(--border)' }}
              >
                <label htmlFor="assignment-id-s2">과제 ID</label>
                <div className="input-actions" style={{ marginTop: 8 }}>
                  <input
                    id="assignment-id-s2"
                    value={assignmentIdInput}
                    onChange={(e) => setAssignmentIdInput(e.target.value)}
                    placeholder="예: 111"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-pill"
                    onClick={() => {
                      if (assignmentIdInput.trim()) selectAssignment(assignmentIdInput.trim());
                    }}
                  >
                    열기
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <StudentStage2Activity assignmentId={activeId} />
        )}
      </div>
    );
  }

  return (
    <>
      <PageHero
        title={activity.title}
        description={`${subjectData.name} · ${STAGE_TITLES[stageNum]}`}
      />
      <PlaceholderCard title={`${stageNum}단계 학습 활동`} message="준비 중입니다." />
    </>
  );
}


interface Stage1AiMessage {
  id: string;
  text: string;
  meta?: string;
}

function formatDueLabel(iso?: string | null) {
  if (!iso) return '마감 없음';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fileExtBadge(name?: string | null) {
  if (!name) return 'DOC';
  const ext = name.split('.').pop()?.toUpperCase() ?? 'DOC';
  return ext.slice(0, 4);
}

function StudentStage1Activity({ assignmentId }: { assignmentId: string }) {
  const [detail, setDetail] = useState<Stage1AssignmentDetailResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<Stage1Parameters>({
    chunk_size: 50,
    top_k: 1,
    temperature: 1,
  });
  const [userTurns, setUserTurns] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<Stage1AiMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitResult, setSubmitResult] = useState<Stage1SubmitResponse | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setUserTurns([]);
    setAiAnswers([]);
    setSelectedId(null);
    setSubmitResult(null);
    setDone(false);
    getStudentStep1Api(assignmentId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        setParams(res.default_parameters);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setLoadError(err instanceof ApiError ? err.message : '과제를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const fixedPrompt =
    detail?.guideline?.trim() || '오늘 학습 주제의 내용을 전체적으로 알려줘';
  const maxAttempts = detail?.attempts.max_attempts ?? 3;
  const usedAttempts = detail?.attempts.used_attempts ?? 0;
  const remaining = detail?.attempts.remaining_attempts ?? Math.max(0, maxAttempts - usedAttempts);
  const selectedAnswer = aiAnswers.find((a) => a.id === selectedId)?.text ?? '';

  const sendChat = async () => {
    if (!detail || remaining <= 0) {
      setToast('제출을 모두 마쳤습니다.');
      return;
    }
    const text = fixedPrompt;
    setLastPrompt(text);
    setUserTurns((prev) => [...prev, text]);
    setChatBusy(true);
    try {
      const res = await postStudentStep1ChatApi(assignmentId, {
        message: text,
        parameters: params,
      });
      const id = `a${Date.now()}`;
      const meta = `청크 ${res.rag_process_visualization.retrieved_chunks}/${res.rag_process_visualization.total_chunks}`;
      setAiAnswers((prev) => [...prev, { id, text: res.ai_response, meta }]);
      setToast('새 답이 도착했습니다. 제출할 답을 클릭해 고르세요.');
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '채팅 요청에 실패했습니다.');
    } finally {
      setChatBusy(false);
    }
  };

  const submit = async () => {
    if (!selectedAnswer.trim() || !lastPrompt.trim()) {
      setToast('먼저 AI 답을 클릭해 고르세요.');
      return;
    }
    if (remaining <= 0) {
      setDone(true);
      return;
    }
    setSubmitBusy(true);
    try {
      const res = await postStudentStep1SubmitApi(assignmentId, {
        final_parameters: params,
        selected_ai_response: selectedAnswer,
        student_prompt: lastPrompt,
      });
      setSubmitResult(res);
      setToast('선택한 답으로 제출했습니다.');
      setSelectedId(null);
      if (detail) {
        setDetail({
          ...detail,
          attempts: {
            ...detail.attempts,
            used_attempts: res.attempts.used_attempts,
            remaining_attempts: res.attempts.remaining_attempts,
          },
          highest_score: res.highest_score,
          best_parameters: params,
        });
      }
      if (res.attempts.remaining_attempts <= 0) {
        window.setTimeout(() => setDone(true), 700);
      }
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '제출에 실패했습니다.');
    } finally {
      setSubmitBusy(false);
    }
  };

  const finish = () => {
    if (usedAttempts === 0) {
      setToast('한 번 이상 제출한 뒤 과제를 마칠 수 있습니다.');
      return;
    }
    setDone(true);
  };

  if (loading) {
    return <p className="hint">과제 불러오는 중…</p>;
  }
  if (loadError || !detail) {
    return <p className="hint">{loadError || '과제 정보가 없습니다.'}</p>;
  }

  if (done && submitResult) {
    return (
      <section className="done-layout">
        <div className="done-hero">
          <p className="done-eyebrow">Stage 1 · 완료</p>
          <h1 className="page-title">과제 끝</h1>
          <p className="page-desc">
            {remaining <= 0 ? '3회 제출을 모두 마쳤습니다.' : '과제를 제출했습니다.'}
          </p>
          <div className="done-score-box">
            <span className="side-title">최종 점수</span>
            <div className="score-row">
              <strong>{submitResult.highest_score}</strong>
              <span>점</span>
            </div>
            <p className="hint">
              제출 {detail.attempts.used_attempts}회 · 최고 점수 기준
            </p>
            <div className="done-sub scores">
              <span>
                faithfulness <strong>{submitResult.evaluation_report.faithfulness_score}/5</strong>
              </span>
              <span>
                relevance <strong>{submitResult.evaluation_report.relevance_score}/5</strong>
              </span>
            </div>
          </div>
        </div>
        <div className="done-grid">
          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◎
              </span>
              <p className="side-title">문제</p>
            </div>
            <p className="mission-text">{detail.question}</p>
          </section>
          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ▦
              </span>
              <p className="side-title">학습 자료</p>
            </div>
            <p className="mission-text">{detail.document_filename || '학습 자료'}</p>
          </section>
          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ▤
              </span>
              <p className="side-title">최고점 파라미터</p>
            </div>
            <div className="done-params">
              <div>
                <span>chunk_size</span>
                <strong>{(detail.best_parameters ?? params).chunk_size}</strong>
              </div>
              <div>
                <span>top_k</span>
                <strong>{(detail.best_parameters ?? params).top_k}</strong>
              </div>
              <div>
                <span>temperature</span>
                <strong>{(detail.best_parameters ?? params).temperature}</strong>
              </div>
            </div>
          </section>
          <section className="info-card done-span-2">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">피드백</p>
            </div>
            <p className="mission-text">{submitResult.evaluation_report.feedback}</p>
          </section>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => setDone(false)}>
            다시 실험해보기
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="layout-split">
        <aside className="side">
          <section className="info-card info-card-mission">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◎
              </span>
              <p className="side-title">문제</p>
            </div>
            <p className="mission-text">{detail.question}</p>
            <p className="hint" style={{ marginTop: 10 }}>
              채팅 질문은 고정되어 있습니다.
            </p>
          </section>

          <section className="info-card info-card-due">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◷
              </span>
              <p className="side-title">마감</p>
            </div>
            <p className="due-value">{formatDueLabel(detail.due_at)}</p>
          </section>

          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ▦
              </span>
              <p className="side-title">학습 자료</p>
            </div>
            <div className="file-card">
              <div className="file-badge">{fileExtBadge(detail.document_filename)}</div>
              <div className="file-meta">
                <strong>{detail.document_filename || '학습 자료'}</strong>
                <span>선생님이 올린 원문</span>
              </div>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                onClick={() => setFileOpen(true)}
                disabled={!detail.document_text}
              >
                보기
              </button>
            </div>
          </section>

          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ▤
              </span>
              <p className="side-title">파라미터</p>
            </div>
            <div className="params params-stack">
              <div className="field-group param">
                <label className="label" htmlFor="p-chunk">
                  chunk_size
                </label>
                <select
                  id="p-chunk"
                  className="field"
                  value={params.chunk_size}
                  onChange={(e) => setParams((p) => ({ ...p, chunk_size: Number(e.target.value) }))}
                >
                  {STAGE1_CHUNK_SIZE_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group param">
                <label className="label" htmlFor="p-topk">
                  top_k
                </label>
                <input
                  id="p-topk"
                  className="field"
                  type="number"
                  min={1}
                  max={50}
                  value={params.top_k}
                  onChange={(e) => setParams((p) => ({ ...p, top_k: Number(e.target.value) }))}
                />
              </div>
              <div className="field-group param">
                <label className="label" htmlFor="p-temp">
                  temperature
                </label>
                <input
                  id="p-temp"
                  className="field"
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={params.temperature}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, temperature: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          </section>
        </aside>

        <section className="main">
          <div className="main-head">
            <h1>대화</h1>
            <p>AI 답을 클릭해 고른 뒤 제출하세요.</p>
          </div>

          <div className="chat">
            <div className="chat-log" aria-live="polite">
              {userTurns.length === 0 && aiAnswers.length === 0 && (
                <p className="hint">전송을 누르면 고정 질문으로 AI 답을 받습니다.</p>
              )}
              {userTurns.map((text, i) => (
                <article key={`u-${i}`} className="bubble user">
                  <div className="meta">
                    <span>나</span>
                  </div>
                  <div>{text}</div>
                </article>
              ))}
              {aiAnswers.map((a, idx) => (
                <article
                  key={a.id}
                  className={`bubble ai${selectedId === a.id ? ' selected' : ''}`}
                  onClick={() => {
                    if (remaining <= 0) return;
                    setSelectedId(a.id);
                  }}
                >
                  <div className="meta">
                    <span>AI 답 {idx + 1}</span>
                    <span className="select-hint">
                      {selectedId === a.id ? '제출용으로 선택됨' : '클릭해서 선택'}
                    </span>
                  </div>
                  <div>{a.text}</div>
                </article>
              ))}
            </div>
            <div className="chat-compose">
              <input className="field" type="text" value={fixedPrompt} readOnly />
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void sendChat()}
                disabled={chatBusy || remaining <= 0}
              >
                {chatBusy ? '…' : '전송'}
              </button>
            </div>
          </div>

          <div className="submit-bar">
            <div className="submit-meta">
              <span className="pill">
                시도 {usedAttempts}/{maxAttempts}
              </span>
              <div className="selected-preview">
                {selectedAnswer ? (
                  <>
                    선택한 답:{' '}
                    <em>
                      {selectedAnswer.slice(0, 42)}
                      {selectedAnswer.length > 42 ? '…' : ''}
                    </em>
                  </>
                ) : remaining <= 0 ? (
                  '제출을 모두 마쳤습니다.'
                ) : (
                  '제출할 답을 선택하세요.'
                )}
              </div>
            </div>
            <div className="actions" style={{ paddingTop: 0 }}>
              <button className="btn btn-ghost" type="button" onClick={finish}>
                과제 제출
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={!selectedId || submitBusy || remaining <= 0}
                onClick={() => void submit()}
              >
                {submitBusy ? '제출 중…' : '고른 AI 답변 확인'}
              </button>
            </div>
          </div>

          {submitResult && (
            <div className="result show">
              <div className="score-row">
                <strong>{submitResult.current_score}</strong>
                <span>점</span>
              </div>
              <p className="hint">{submitResult.evaluation_report.feedback}</p>
            </div>
          )}
        </section>
      </div>

      <div
        className={`modal${fileOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setFileOpen(false);
        }}
      >
        <div className="modal-card">
          <header>
            <h2>{detail.document_filename || '학습 자료'}</h2>
            <button className="btn btn-ghost" type="button" onClick={() => setFileOpen(false)}>
              닫기
            </button>
          </header>
          <div className="doc">{detail.document_text || '원문을 불러올 수 없습니다.'}</div>
        </div>
      </div>

      <div className={`toast${toast ? ' show' : ''}`} role="status">
        {toast}
      </div>
    </>
  );
}


export function StudentResultsPage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const { data, loading, error } = useFetch(fetchStudentRecordsApi, [], Boolean(useApi));

  if (!useApi) {
    return (
      <>
        <PageHero title="점수" description="과목별 · 단계별 점수를 확인합니다." />
        <PlaceholderCard title="점수표" />
      </>
    );
  }

  return (
    <>
      <PageHero
        title="내가 배운 것"
        description={`학급 평균 ${data?.class_total_average ?? 0}점`}
      />
      <div className="card">
        <div className="card-header">
          <span className="card-title">단계별 기록</span>
        </div>
        <div className="card-body">
          <ApiStateBody
            loading={loading}
            error={error}
            isEmpty={!data?.records.length}
            emptyMessage="아직 학습 기록이 없습니다."
          >
            {data?.records.map((record) => (
              <div
                key={record.stage}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {record.title ?? `${record.stage}단계`}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                  최고 {record.highest_score ?? '-'}점 · {record.attempts_count}회 시도
                </div>
                {record.ai_feedback && (
                  <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                    {record.ai_feedback}
                  </div>
                )}
              </div>
            ))}
          </ApiStateBody>
        </div>
      </div>
    </>
  );
}

export function StudentAttendancePage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const { data, loading, error } = useFetch(fetchStudentAttendanceApi, [], Boolean(useApi));

  if (!useApi) {
    return (
      <>
        <PageHero title="출석" description="수업 참여 기록을 확인합니다." />
        <PlaceholderCard title="출석 현황" />
      </>
    );
  }

  return (
    <>
      <PageHero
        title="출석"
        description={`출석률 ${Math.round(data?.attendance_rate ?? 0)}% · 출석 ${data?.present_count ?? 0} · 지각 ${data?.late_count ?? 0} · 결석 ${data?.absent_count ?? 0}`}
      />
      <div className="card">
        <div className="card-header">
          <span className="card-title">출석 기록</span>
        </div>
        <div className="card-body">
          <ApiStateBody
            loading={loading}
            error={error}
            isEmpty={!data?.attendance_records.length}
          >
            {data?.attendance_records.map((record, index) => (
              <div
                key={`${record.date ?? index}-${record.week ?? ''}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14,
                }}
              >
                <span>{record.date ?? record.week ?? '-'}</span>
                <span>{record.status}</span>
              </div>
            ))}
          </ApiStateBody>
        </div>
      </div>
    </>
  );
}

export function StudentNoticesPage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const { data, loading, error } = useFetch(fetchStudentNoticesApi, [], Boolean(useApi));

  if (!useApi) {
    return (
      <>
        <PageHero title="공지사항" description="선생님이 등록한 공지를 확인합니다." />
        <PlaceholderCard title="공지 목록" />
      </>
    );
  }

  return (
    <>
      <PageHero title="공지사항" description={`총 ${data?.total_count ?? 0}건`} />
      <div className="card">
        <div className="card-header">
          <span className="card-title">공지 목록</span>
        </div>
        <div className="card-body">
          <ApiStateBody loading={loading} error={error} isEmpty={!data?.notices.length}>
            {data?.notices.map((notice) => (
              <div
                key={notice.notice_id}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{notice.title}</span>
                  {notice.is_new && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--primary)',
                        background: 'var(--primary-bg)',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      NEW
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>
                  {notice.author_name}
                  {notice.created_at
                    ? ` · ${new Date(notice.created_at).toLocaleDateString()}`
                    : ''}
                </div>
                <p style={{ fontSize: 14, marginTop: 10, lineHeight: 1.55 }}>{notice.content}</p>
              </div>
            ))}
          </ApiStateBody>
        </div>
      </div>
    </>
  );
}
