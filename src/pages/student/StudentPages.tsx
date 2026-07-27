import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  fetchStudentAttendanceApi,
  fetchStudentDashboardAssignmentsApi,
  fetchStudentNoticesApi,
  fetchStudentRecordsApi,
  getStudentStep1Api,
  getStudentStep2Api,
  postStudentStep1ChatApi,
  postStudentStep1SubmitApi,
  postStudentStep2CorrectionApi,
  postStudentStep2HighlightApi,
} from '../../api';
import type {
  HallucinationType,
  Stage1AssignmentDetailResponse,
  Stage1Parameters,
  Stage1SubmitResponse,
  Stage2AssignmentDetailResponse,
  Step2CorrectionResponse,
  Step2HighlightResponse,
} from '../../api/types';
import { STAGE1_CHUNK_SIZE_PRESETS } from '../../api/types';
import { ApiStateBody, PageHero, PlaceholderCard } from '../../components/common';
import {
  FALLBACK_HALLUCINATION_OPTIONS,
  HALLUCINATION_LABELS,
} from '../../constants/assignments';
import { STAGE_TITLES, STUDENT_SUBJECTS } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import type { SubjectKey } from '../../types';
import { PROGRESS_LABELS } from '../../utils/labels';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  meta?: string;
}

interface Stage3PrototypeResult {
  topic: string;
  pro_argument: string;
  con_argument: string;
  pro_claims_checked: { claim: string; verdict: string; reason: string }[];
  con_claims_checked: { claim: string; verdict: string; reason: string }[];
  reliable_points: string[];
  unreliable_points: string[];
  balanced_summary: string;
  student_guide: string;
}

export function StudentStagePage() {
  const { subject, stage } = useParams<{ subject: SubjectKey; stage: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const subjectData = STUDENT_SUBJECTS.find((s) => s.key === subject);
  const stageNum = Number(stage);
  const activity = subjectData?.activities.find((a) => a.stage === stageNum);
  const useApi = user && !user.isDemo && (stageNum === 1 || stageNum === 2);
  const isStage3Prototype = stageNum === 3;

  const assignmentIdParam = searchParams.get('assignmentId');
  const [assignmentIdInput, setAssignmentIdInput] = useState(assignmentIdParam ?? '');
  const [activeId, setActiveId] = useState<string | null>(assignmentIdParam);

  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], Boolean(useApi));

  useEffect(() => {
    if (assignmentIdParam) {
      setActiveId(assignmentIdParam);
      setAssignmentIdInput(assignmentIdParam);
    }
  }, [assignmentIdParam]);

  if (!subjectData || !activity || Number.isNaN(stageNum) || stageNum < 1 || stageNum > 4) {
    return <Navigate to="/student" replace />;
  }

  if (!useApi && stageNum !== 3) {
    return (
      <>
        <PageHero
          title={activity.title}
          description={`${subjectData.name} · ${STAGE_TITLES[stageNum]}`}
        />
        <PlaceholderCard
          title={`${stageNum}단계 학습 활동 UI`}
          message={
            stageNum > 2
              ? '3·4단계 API는 백엔드에 아직 없습니다.'
              : '데모 모드이거나 API 연동 대상이 아닙니다.'
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

  if (isStage3Prototype) {
    return (
      <>
        <PageHero
          title={activity.title}
          description={`${subjectData.name} · ${STAGE_TITLES[stageNum]}`}
        />
        <StudentStage3PrototypeActivity assignmentId={activeId ?? 'stage3-prototype'} />
      </>
    );
  }

  return (
    <>
      <PageHero
        title={activity.title}
        description={`${subjectData.name} · ${STAGE_TITLES[stageNum]}`}
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">과제 선택</span>
        </div>
        <div className="card-body">
          <ApiStateBody
            loading={assignments.loading}
            error={assignments.error}
            isEmpty={!assignments.data?.assignments.length}
            emptyMessage="배정된 과제가 없습니다. 과제 ID를 직접 입력할 수 있습니다."
          >
            {assignments.data?.assignments
              .filter((a) => a.stage == null || a.stage === stageNum)
              .map((a) => (
                <button
                  key={a.assignment_id}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    borderColor:
                      String(a.assignment_id) === activeId ? 'var(--primary)' : undefined,
                  }}
                  onClick={() => selectAssignment(String(a.assignment_id))}
                >
                  {a.title ?? `#${a.assignment_id}`}
                  {a.status ? ` · ${PROGRESS_LABELS[a.status]}` : ''}
                </button>
              ))}
          </ApiStateBody>
          <div className="form-group" style={{ marginTop: 12, marginBottom: 0, maxWidth: 280 }}>
            <label className="form-label" htmlFor="assignment-id">
              과제 ID
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="assignment-id"
                className="form-control"
                value={assignmentIdInput}
                onChange={(e) => setAssignmentIdInput(e.target.value)}
                placeholder="예: 101"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
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

      {!activeId ? (
        <PlaceholderCard title="활동을 시작하려면 과제를 선택하세요" />
      ) : stageNum === 1 ? (
        <StudentStage1Activity assignmentId={activeId} />
      ) : stageNum === 2 ? (
        <StudentStage2Activity assignmentId={activeId} />
      ) : (
        <PlaceholderCard title={`${stageNum}단계 학습 활동 UI`} message="준비 중입니다." />
      )}
    </>
  );
}

function StudentStage3PrototypeActivity({ assignmentId }: { assignmentId: string }) {
  const [topic, setTopic] = useState('학교에 AI 시험 감독 시스템을 도입해야 하는가?');
  const [followUpInput, setFollowUpInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Stage3PrototypeResult | null>(null);

  useEffect(() => {
    setMessages([]);
    setBusy(false);
    setFollowUpInput('');
    setResult(null);
  }, [assignmentId]);

  const runDebate = async (inputTopic: string) => {
    const normalizedTopic = inputTopic.trim();
    if (!normalizedTopic) return;

    const nextResult = buildStage3PrototypeResult(normalizedTopic);
    setBusy(true);
    setMessages([{ role: 'user', text: normalizedTopic, meta: '학생이 사회자로 토론 주제를 제시함' }]);
    setResult(null);

    const stagedMessages: ChatMessage[] = [
      {
        role: 'bot',
        text: nextResult.pro_argument,
        meta: '찬성 Agent',
      },
      {
        role: 'bot',
        text: nextResult.con_argument,
        meta: '반대 Agent',
      },
      {
        role: 'bot',
        text: formatStage3FactCheck(nextResult),
        meta: '팩트체커 Agent',
      },
    ];

    for (const staged of stagedMessages) {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setMessages((prev) => [...prev, staged]);
    }

    setResult(nextResult);
    setBusy(false);
  };

  const sendFollowUp = async () => {
    const text = followUpInput.trim();
    if (!text || !result || busy) return;
    setFollowUpInput('');
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: 'user', text, meta: '학생 추가 질문' },
    ]);

    const answer = buildStage3FollowUp(text, result);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    setMessages((prev) => [
      ...prev,
      {
        role: 'bot',
        text: answer.text,
        meta: answer.meta,
      },
    ]);
    setBusy(false);
  };

  return (
    <>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">토론 주제 · 진행 안내</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="stage3-topic">
                토론 주제
              </label>
              <textarea
                id="stage3-topic"
                className="form-control"
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={busy}
              />
            </div>
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: 'var(--gray-50)',
                border: '1px solid var(--border)',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>프로토타입 진행 순서</div>
              <ol style={{ paddingLeft: 18 }}>
                <li>학생이 토론 주제를 던집니다.</li>
                <li>찬성 Agent와 반대 Agent가 각각 주장합니다.</li>
                <li>팩트체커 Agent가 두 주장을 비교 검증합니다.</li>
                <li>학생이 추가 질문을 던지며 멀티 에이전트를 체험합니다.</li>
              </ol>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void runDebate(topic)}
                disabled={busy}
              >
                {busy ? '토론 생성 중…' : '토론 시작'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setMessages([]);
                  setResult(null);
                  setFollowUpInput('');
                }}
                disabled={busy}
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">에이전트 역할</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['찬성 Agent', '효율성과 공정성, 교사 업무 경감 관점에서 주장합니다.'],
                ['반대 Agent', '프라이버시, 오탐지, 인권 침해 관점에서 주장합니다.'],
                ['팩트체커 Agent', '양측 주장의 수치 과장, 근거 부족, 사실 오류를 판정합니다.'],
              ].map(([title, desc]) => (
                <div
                  key={title}
                  style={{
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">멀티 에이전트 채팅</span>
        </div>
        <div className="card-body">
          <div className="chat-log" style={{ maxHeight: 440 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                토론 시작을 누르면 찬성·반대·팩트체커 순서로 응답이 생성됩니다.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`}>
                <div className={`chat-bubble ${m.role}`}>{m.text}</div>
                {m.meta && (
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>{m.meta}</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-control"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              placeholder="예: 반대 Agent야, 개인정보 우려를 한 문장으로 다시 말해줘"
              disabled={!result || busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendFollowUp();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void sendFollowUp()}
              disabled={!result || busy}
            >
              질문
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">팩트체크 요약</span>
            </div>
            <div className="card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ marginBottom: 10 }}>{result.balanced_summary}</p>
              <div style={{ marginBottom: 10 }}>
                <strong>신뢰 가능한 포인트</strong>
                <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                  {result.reliable_points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>의심해야 할 포인트</strong>
                <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                  {result.unreliable_points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">학생 보고서 가이드</span>
            </div>
            <div className="card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              {result.student_guide}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function buildStage3PrototypeResult(topic: string): Stage3PrototypeResult {
  return {
    topic,
    pro_argument:
      '【찬성 입장】\n주장 요약: 학교 시험에 AI 감독 시스템을 도입하면 감독 효율과 공정성을 높일 수 있습니다.\n핵심 근거:\n1. 반복적인 감독 업무를 줄여 교사가 학생 피드백에 더 집중할 수 있습니다.\n2. 온라인·대규모 시험에서 일관된 기준으로 부정행위 징후를 탐지할 수 있습니다.\n예상 효과: 감독 비용과 행정 부담을 줄이면서 시험 운영을 표준화할 수 있습니다.',
    con_argument:
      '【반대 입장】\n주장 요약: AI 시험 감독 시스템은 학생 프라이버시와 인권을 침해할 위험이 큽니다.\n핵심 근거:\n1. 카메라·마이크·행동 데이터 수집은 학생에게 과도한 감시 압박을 줄 수 있습니다.\n2. 오탐지와 알고리즘 편향이 특정 학생에게 불이익을 줄 수 있습니다.\n우려되는 점: 기술 효율을 이유로 감시가 일상화될 수 있습니다.',
    pro_claims_checked: [
      {
        claim: 'AI 감독 시스템이 감독 효율을 높인다.',
        verdict: 'supported',
        reason: '일부 온라인 시험 환경에서는 감독 보조와 기록 자동화에 실제 도움이 됩니다.',
      },
      {
        claim: 'AI만으로 공정성을 완벽히 보장한다.',
        verdict: 'exaggerated',
        reason: '오탐지, 모델 편향, 운영 정책의 차이 때문에 완전한 보장은 어렵습니다.',
      },
    ],
    con_claims_checked: [
      {
        claim: '프라이버시 침해 우려가 있다.',
        verdict: 'supported',
        reason: '생체·행동 데이터 수집은 실제 윤리와 법적 쟁점이 존재합니다.',
      },
      {
        claim: '도입 즉시 감시 사회가 완성된다.',
        verdict: 'exaggerated',
        reason: '위험은 있지만, 제도 설계와 범위 제한에 따라 영향이 달라집니다.',
      },
    ],
    reliable_points: [
      '교사 업무 경감과 시험 운영 효율화 가능성',
      '학생 프라이버시와 오탐지에 대한 현실적 우려',
    ],
    unreliable_points: [
      'AI가 완벽하게 부정행위를 판별한다는 절대적 표현',
      '도입 즉시 모든 학생 인권이 붕괴된다는 비약',
    ],
    balanced_summary:
      `${topic}에 대한 토론에서는 효율성과 인권 보호가 충돌합니다. 기술의 장점은 존재하지만, 오탐지·편향·데이터 수집 범위 같은 조건을 함께 따져야 균형 잡힌 결론을 낼 수 있습니다.`,
    student_guide:
      '최종 보고서에는 1) 양측이 제시한 핵심 근거, 2) 팩트체커가 지적한 과장 표현, 3) 기술 도입 시 필요한 안전장치를 함께 써 보세요.',
  };
}

function formatStage3FactCheck(result: Stage3PrototypeResult): string {
  const lines = [
    '{',
    `  "topic": "${result.topic}",`,
    '  "pro_claims_checked": [',
    ...result.pro_claims_checked.map(
      (item, index) =>
        `    {"claim": "${item.claim}", "verdict": "${item.verdict}", "reason": "${item.reason}"}${index < result.pro_claims_checked.length - 1 ? ',' : ''}`,
    ),
    '  ],',
    '  "con_claims_checked": [',
    ...result.con_claims_checked.map(
      (item, index) =>
        `    {"claim": "${item.claim}", "verdict": "${item.verdict}", "reason": "${item.reason}"}${index < result.con_claims_checked.length - 1 ? ',' : ''}`,
    ),
    '  ],',
    `  "balanced_summary": "${result.balanced_summary}",`,
    `  "student_guide": "${result.student_guide}"`,
    '}',
  ];
  return lines.join('\n');
}

function buildStage3FollowUp(
  question: string,
  result: Stage3PrototypeResult,
): { text: string; meta: string } {
  const normalized = question.toLowerCase();

  if (normalized.includes('찬성')) {
    return {
      meta: '찬성 Agent 재응답',
      text: `찬성 Agent 추가 설명:\n${result.reliable_points[0]}을 중심으로 보면, AI는 교사의 감독 자체를 없애기보다 보조하고 기록을 정리하는 역할에서 가장 현실적인 장점이 있습니다.`,
    };
  }

  if (normalized.includes('반대') || normalized.includes('프라이버시')) {
    return {
      meta: '반대 Agent 재응답',
      text: '반대 Agent 추가 설명:\n개인정보 우려의 핵심은 단순한 촬영이 아니라, 학생의 시선·행동 데이터가 장기간 저장되거나 다른 목적으로 활용될 수 있다는 점입니다.',
    };
  }

  return {
    meta: '팩트체커 Agent 재응답',
    text: `팩트체커 추가 설명:\n질문 "${question}"에 답하자면, 핵심은 양측이 모두 절대적 표현을 줄이고 실제 운영 조건과 근거를 더 구체적으로 제시해야 한다는 점입니다.`,
  };
}

function StudentStage1Activity({ assignmentId }: { assignmentId: string }) {
  const [detail, setDetail] = useState<Stage1AssignmentDetailResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<Stage1Parameters>({
    chunk_size: 200,
    top_k: 2,
    temperature: 0.9,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [submitResult, setSubmitResult] = useState<Stage1SubmitResponse | null>(null);
  const [actionErr, setActionErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setMessages([]);
    setSelectedAnswer('');
    setSubmitResult(null);
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

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    setLastPrompt(text);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setChatBusy(true);
    setActionErr('');
    try {
      const res = await postStudentStep1ChatApi(assignmentId, {
        message: text,
        parameters: params,
      });
      const meta = `청크 ${res.rag_process_visualization.retrieved_chunks}/${res.rag_process_visualization.total_chunks} · 점수 ${res.rag_process_visualization.vector_search_score}`;
      setMessages((prev) => [...prev, { role: 'bot', text: res.ai_response, meta }]);
      setSelectedAnswer(res.ai_response);
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '채팅 요청에 실패했습니다.');
    } finally {
      setChatBusy(false);
    }
  };

  const submit = async () => {
    if (!selectedAnswer.trim() || !lastPrompt.trim()) {
      setActionErr('AI 답변을 받은 뒤 제출해 주세요.');
      return;
    }
    setActionErr('');
    try {
      const res = await postStudentStep1SubmitApi(assignmentId, {
        final_parameters: params,
        selected_ai_response: selectedAnswer,
        student_prompt: lastPrompt,
      });
      setSubmitResult(res);
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
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '제출에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="placeholder-body">과제 불러오는 중…</div>
      </div>
    );
  }
  if (loadError || !detail) {
    return (
      <div className="card">
        <div className="placeholder-body" style={{ color: 'var(--negative)' }}>
          {loadError || '과제 정보가 없습니다.'}
        </div>
      </div>
    );
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <span className="card-title">문제 · 파라미터</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{detail.question}</p>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 14, lineHeight: 1.5 }}>
            {detail.guideline}
          </p>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
            시도 {detail.attempts.used_attempts}
            {detail.attempts.max_attempts != null ? `/${detail.attempts.max_attempts}` : ''} · 남음{' '}
            {detail.attempts.remaining_attempts}
            {detail.highest_score != null ? ` · 최고 ${detail.highest_score}점` : ''}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="p-chunk">
              chunk_size
            </label>
            <select
              id="p-chunk"
              className="form-control"
              value={params.chunk_size}
              onChange={(e) => setParams((p) => ({ ...p, chunk_size: Number(e.target.value) }))}
            >
              {STAGE1_CHUNK_SIZE_PRESETS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              {detail.parameter_explanations.chunk_size}
            </p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="p-topk">
              top_k
            </label>
            <input
              id="p-topk"
              className="form-control"
              type="number"
              min={1}
              max={50}
              value={params.top_k}
              onChange={(e) => setParams((p) => ({ ...p, top_k: Number(e.target.value) }))}
            />
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              {detail.parameter_explanations.top_k}
            </p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="p-temp">
              temperature
            </label>
            <input
              id="p-temp"
              className="form-control"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={params.temperature}
              onChange={(e) => setParams((p) => ({ ...p, temperature: Number(e.target.value) }))}
            />
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              {detail.parameter_explanations.temperature}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">AI 답 실험</span>
        </div>
        <div className="card-body">
          <div className="chat-log">
            {messages.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                가이드라인의 예시 질문으로 시작해 보세요.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`}>
                <div className={`chat-bubble ${m.role}`}>{m.text}</div>
                {m.meta && (
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>{m.meta}</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-control"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="질문을 입력하세요"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendChat();
                }
              }}
              disabled={chatBusy}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void sendChat()}
              disabled={chatBusy}
            >
              전송
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void submit()}>
              현재 답변 · 파라미터로 제출
            </button>
          </div>
          {actionErr && <p className="inline-alert error">{actionErr}</p>}
          {submitResult && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: 'var(--gray-50)',
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                점수 {submitResult.current_score}점
                {submitResult.is_highest_score ? ' (최고점)' : ''} · 최고{' '}
                {submitResult.highest_score}점
              </div>
              <div>
                faithfulness {submitResult.evaluation_report.faithfulness_score} · relevance{' '}
                {submitResult.evaluation_report.relevance_score}
              </div>
              <div style={{ marginTop: 6 }}>{submitResult.evaluation_report.feedback}</div>
              <div style={{ color: 'var(--gray-500)', marginTop: 6 }}>
                남은 시도 {submitResult.attempts.remaining_attempts}회
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentStage2Activity({ assignmentId }: { assignmentId: string }) {
  const [detail, setDetail] = useState<Stage2AssignmentDetailResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [highlightText, setHighlightText] = useState('');
  const [errorType, setErrorType] = useState<HallucinationType>('RETRIEVAL_ERROR');
  const [reason, setReason] = useState('');
  const [highlightResult, setHighlightResult] = useState<Step2HighlightResponse | null>(null);
  const [corrections, setCorrections] = useState<{ original_highlight: string; student_answer: string }[]>(
    [],
  );
  const [correctionResult, setCorrectionResult] = useState<Step2CorrectionResponse | null>(null);
  const [actionErr, setActionErr] = useState('');

  const reload = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getStudentStep2Api(assignmentId);
      setDetail(res);
      const firstOption = res.hallucination_type_options?.[0];
      if (firstOption?.value) {
        setErrorType(firstOption.value as HallucinationType);
      }
      if (res.highlight_phase_complete && res.cleared_highlights.length) {
        setCorrections((prev) => {
          const byHighlight = new Map(prev.map((c) => [c.original_highlight, c.student_answer]));
          return res.cleared_highlights.map((h) => ({
            original_highlight: h,
            student_answer: byHighlight.get(h) ?? '',
          }));
        });
      }
    } catch (err) {
      setDetail(null);
      setLoadError(err instanceof ApiError ? err.message : '과제를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const submitHighlight = async () => {
    if (!highlightText.trim() || !reason.trim()) {
      setActionErr('하이라이트 문장과 이유를 입력해 주세요.');
      return;
    }
    setActionErr('');
    try {
      const res = await postStudentStep2HighlightApi(assignmentId, {
        submissions: [
          {
            highlighted_text: highlightText.trim(),
            student_error_type: errorType,
            student_reason: reason.trim(),
          },
        ],
      });
      setHighlightResult(res);
      await reload();
      if (res.highlight_phase_complete) {
        setCorrections(
          res.cleared_highlights.map((h) => ({
            original_highlight: h,
            student_answer: '',
          })),
        );
      }
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '하이라이트 제출에 실패했습니다.');
    }
  };

  const submitCorrection = async () => {
    if (!detail) return;
    if (corrections.length !== detail.expected_error_count) {
      setActionErr(`교정 항목이 ${detail.expected_error_count}개여야 합니다.`);
      return;
    }
    if (corrections.some((c) => !c.student_answer.trim())) {
      setActionErr('모든 교정 답을 입력해 주세요.');
      return;
    }
    setActionErr('');
    setCorrectionResult(null);
    try {
      const res = await postStudentStep2CorrectionApi(assignmentId, {
        corrections: corrections.map((c) => ({
          original_highlight: c.original_highlight,
          student_answer: c.student_answer.trim(),
        })),
      });
      setCorrectionResult(res);
      await reload();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '교정 제출에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="placeholder-body">과제 불러오는 중…</div>
      </div>
    );
  }
  if (loadError || !detail) {
    return (
      <div className="card">
        <div className="placeholder-body" style={{ color: 'var(--negative)' }}>
          {loadError || '과제 정보가 없습니다.'}
        </div>
      </div>
    );
  }

  const typeOptions =
    detail.hallucination_type_options?.length > 0
      ? detail.hallucination_type_options
      : [...FALLBACK_HALLUCINATION_OPTIONS];

  const selectedOption = typeOptions.find((opt) => opt.value === errorType);

  return (
    <>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">참고 문서</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {detail.reference_document_text}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">AI 오답 · 질문</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>{detail.question}</p>
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {detail.flawed_ai_response}
            </p>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 12 }}>
              남은 오류 {detail.remaining_errors_to_find}개 · 시도 {detail.attempts.used_attempts}
              {detail.attempts.max_attempts != null ? `/${detail.attempts.max_attempts}` : ''} · 남음{' '}
              {detail.attempts.remaining_attempts}
            </div>
            {detail.cleared_highlights.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <strong>찾은 구간:</strong>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {detail.cleared_highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {!detail.highlight_phase_complete ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">오답 하이라이트</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="hl-text">
                틀린 문장 (AI 오답에서 복사)
              </label>
              <textarea
                id="hl-text"
                className="form-control"
                rows={3}
                value={highlightText}
                onChange={(e) => setHighlightText(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hl-type">
                환각 유형
              </label>
              <select
                id="hl-type"
                className="form-control"
                value={errorType}
                onChange={(e) => setErrorType(e.target.value as HallucinationType)}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label || HALLUCINATION_LABELS[opt.value] || opt.value}
                  </option>
                ))}
              </select>
              {selectedOption?.description && (
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                  {selectedOption.description}
                </p>
              )}
              {detail.hallucination_type_hints?.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                  힌트:{' '}
                  {detail.hallucination_type_hints
                    .map((hint) => HALLUCINATION_LABELS[hint] ?? hint)
                    .join(' · ')}
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hl-reason">
                왜 틀렸는지 (문서 근거 포함)
              </label>
              <textarea
                id="hl-reason"
                className="form-control"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void submitHighlight()}>
              하이라이트 제출
            </button>
            {actionErr && <p className="inline-alert error">{actionErr}</p>}
            {highlightResult?.results[0] && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'var(--gray-50)',
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {highlightResult.results[0].is_correct ? '정답' : '오답'}
                </div>
                <div style={{ marginTop: 6 }}>
                  {highlightResult.results[0].evaluation_report?.ai_feedback}
                </div>
                {highlightResult.results[0].correct_answer && (
                  <div style={{ marginTop: 6 }}>정답 예: {highlightResult.results[0].correct_answer}</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">빈칸 교정 제출</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
              찾은 오류 {detail.expected_error_count}개에 대해 올바른 문장을 작성하세요.
            </p>
            {corrections.map((c, idx) => (
              <div key={c.original_highlight} className="form-group">
                <label className="form-label">원문: {c.original_highlight}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={c.student_answer}
                  onChange={(e) => {
                    const next = [...corrections];
                    next[idx] = { ...c, student_answer: e.target.value };
                    setCorrections(next);
                  }}
                  placeholder="올바른 문장"
                />
              </div>
            ))}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void submitCorrection()}>
              교정 제출
            </button>
            {actionErr && <p className="inline-alert error">{actionErr}</p>}
            {correctionResult && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  background: 'var(--gray-50)',
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {correctionResult.is_passed ? '통과' : '미통과'} · 점수 {correctionResult.score}점
                </div>
                {correctionResult.final_correct_sentence && (
                  <div style={{ marginBottom: 10 }}>
                    최종 정답 예: {correctionResult.final_correct_sentence}
                  </div>
                )}
                {correctionResult.feedback_details?.map((item, idx) => (
                  <div
                    key={`${item.student_found_error}-${idx}`}
                    style={{
                      paddingTop: 10,
                      marginTop: idx === 0 ? 0 : 10,
                      borderTop: idx === 0 ? undefined : '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {item.is_item_passed ? '항목 통과' : '항목 미통과'} · {item.student_found_error}
                    </div>
                    <div style={{ marginTop: 4 }}>내 답: {item.student_answer}</div>
                    {item.ai_feedback && <div style={{ marginTop: 4 }}>{item.ai_feedback}</div>}
                    {item.hallucination_reason && (
                      <div style={{ marginTop: 4, color: 'var(--gray-600)' }}>
                        환각 이유: {item.hallucination_reason}
                      </div>
                    )}
                    {item.reference_evidence && (
                      <div style={{ marginTop: 4, color: 'var(--gray-600)' }}>
                        문서 근거: {item.reference_evidence}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
