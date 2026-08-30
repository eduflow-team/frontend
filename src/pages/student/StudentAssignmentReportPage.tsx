import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ApiError,
  fetchStudentDashboardAssignmentsApi,
  getStudentStep1Api,
  getStudentStep2Api,
  getStudentStep3Api,
  getStudentStep4Api,
} from '../../api';
import type {
  Stage1AssignmentDetailResponse,
  Stage1FinalizeResponse,
  Stage2AssignmentDetailResponse,
  Stage4AssignmentDetailResponse,
} from '../../api/types';
import {
  DoneSheetBlock,
  DoneSheetMetaTag,
  DoneSheetReport,
} from '../../components/student/reports/DoneSheetReport';
import { Stage3ReportView } from '../../components/student/reports/Stage3ReportView';
import { normalizeSubjectKey } from '../../constants/assignments';
import { subjectPageTitle } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { STUDENT_DASHBOARD_DEMO } from '../../mocks/studentDashboard';
import { STAGE2_DEMO, getStage2ErrorMarks } from '../../mocks/stage2Demo';
import { buildStage3GradeResultFromDetail } from './stage3/StudentStage3Activity';

function buildStage1FinalResult(
  detail: Stage1AssignmentDetailResponse,
): Stage1FinalizeResponse | null {
  if (!detail.is_finalized) return null;
  const summaries = detail.attempt_summaries ?? [];
  const finalAttempt =
    summaries.find((a) => a.is_final) ??
    summaries.find((a) => a.attempt_number === detail.final_attempt_number) ??
    summaries[summaries.length - 1];
  if (!finalAttempt) return null;
  return {
    attempt_number: finalAttempt.attempt_number,
    current_score: finalAttempt.score,
    highest_score: finalAttempt.score,
    is_correct: finalAttempt.is_correct,
    evaluation_report: {
      is_correct: finalAttempt.is_correct,
      correct_score: finalAttempt.correct_score,
      resource_penalty: finalAttempt.resource_penalty,
      feedback: finalAttempt.feedback,
    },
    attempts: {
      used_attempts: detail.attempts.used_attempts,
      remaining_attempts: detail.attempts.remaining_attempts,
    },
    attempt_summaries: summaries,
    is_finalized: true,
    correct_answer: detail.correct_answer,
  };
}

function buildAiResponseParts(flawedAiResponse: string, clearedHighlights: string[]) {
  if (!flawedAiResponse) return [{ type: 'text' as const, value: '' }];
  const cleared = [...clearedHighlights].filter(Boolean).sort((a, b) => b.length - a.length);
  if (cleared.length === 0) return [{ type: 'text' as const, value: flawedAiResponse }];

  const parts: { type: 'text' | 'cleared'; value: string }[] = [];
  let cursor = 0;
  const text = flawedAiResponse;

  while (cursor < text.length) {
    let nearest: string | null = null;
    let nearestIndex = text.length;
    for (const span of cleared) {
      const idx = text.indexOf(span, cursor);
      if (idx !== -1 && idx < nearestIndex) {
        nearest = span;
        nearestIndex = idx;
      }
    }
    if (!nearest) {
      parts.push({ type: 'text', value: text.slice(cursor) });
      break;
    }
    if (nearestIndex > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, nearestIndex) });
    }
    parts.push({ type: 'cleared', value: nearest });
    cursor = nearestIndex + nearest.length;
  }
  return parts;
}

function buildDemoStage2Detail(): Stage2AssignmentDetailResponse {
  const marks = getStage2ErrorMarks();
  const flawed = STAGE2_DEMO.flawedParts.map((p) => p.text).join('');
  return {
    assignment_id: 2,
    title: STAGE2_DEMO.title,
    reference_document_filename: 'stage2-demo.pdf',
    reference_document_url: '',
    reference_document_text: STAGE2_DEMO.referenceDoc,
    question: STAGE2_DEMO.question,
    flawed_ai_response: flawed,
    due_at: null,
    expected_error_count: STAGE2_DEMO.expectedErrorCount,
    hallucination_type_options: [],
    hallucination_type_hints: marks.map((m) => m.correctType),
    status: 'COMPLETED',
    highlight_phase_complete: true,
    remaining_errors_to_find: 0,
    attempts: {
      max_attempts: STAGE2_DEMO.maxAttempts,
      used_attempts: STAGE2_DEMO.maxAttempts,
      remaining_attempts: 0,
    },
    cleared_highlights: marks.map((m) => m.text),
  };
}

function ReportShell({
  title,
  subjectLabel,
  children,
}: {
  title: string;
  subjectLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="s-assignment-report">
      <div className="shell wide">
        <nav className="s-report-nav">
          <Link to="/student/results" className="s-report-back">
            ← 점수 현황
          </Link>
        </nav>
        <header className="s-report-head">
          <div>
            <p className="done-eyebrow">{subjectLabel}</p>
            <h1 className="s-report-title">{title}</h1>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function Stage1ReportView({
  detail,
  finalResult,
}: {
  detail: Stage1AssignmentDetailResponse;
  finalResult: Stage1FinalizeResponse;
}) {
  const summaries = detail.attempt_summaries ?? [];
  const chosen =
    summaries.find((a) => a.attempt_number === finalResult.attempt_number) ??
    summaries.find((a) => a.is_final);
  const shownParams = chosen?.parameters ?? detail.best_parameters ?? detail.default_parameters;
  const answerText = finalResult.correct_answer || detail.correct_answer;

  return (
    <DoneSheetReport
      score={finalResult.highest_score}
      meta={
        <>
          <DoneSheetMetaTag tone={finalResult.is_correct ? 'ok' : 'bad'}>
            {finalResult.is_correct ? '정답' : '오답'}
          </DoneSheetMetaTag>
          <span>최종 {finalResult.attempt_number}회차</span>
          <span>리소스 감점 {finalResult.evaluation_report.resource_penalty}</span>
        </>
      }
    >
      <DoneSheetBlock label="문제">
        <p className="done-feedback">{detail.question}</p>
      </DoneSheetBlock>
      <DoneSheetBlock label="제출 답안">
        <p className="done-feedback">{chosen?.student_answer || '—'}</p>
      </DoneSheetBlock>
      <DoneSheetBlock label="제출 파라미터">
        <div className="done-params">
          <div>
            <span>chunk_size</span>
            <strong>{shownParams.chunk_size}</strong>
          </div>
          <div>
            <span>top_k</span>
            <strong>{shownParams.top_k}</strong>
          </div>
          <div>
            <span>temperature</span>
            <strong>{shownParams.temperature}</strong>
          </div>
        </div>
      </DoneSheetBlock>
      <DoneSheetBlock label="피드백">
        <p className="done-feedback">{finalResult.evaluation_report.feedback}</p>
        {answerText ? (
          <p className="done-answer">
            정답 <strong>{answerText}</strong>
          </p>
        ) : (
          <p className="done-answer is-muted">정답 문구는 마감 후에 공개됩니다.</p>
        )}
      </DoneSheetBlock>
    </DoneSheetReport>
  );
}

function Stage2ReportView({ detail, score }: { detail: Stage2AssignmentDetailResponse; score: number }) {
  const parts = buildAiResponseParts(detail.flawed_ai_response, detail.cleared_highlights);
  const summaryText =
    detail.cleared_highlights.length > 0
      ? `환각 구간 ${detail.cleared_highlights.length}곳을 찾았습니다.${detail.status === 'COMPLETED' ? ' 교정까지 제출했습니다.' : ''}`
      : '아직 찾은 환각 구간이 없습니다.';

  return (
    <DoneSheetReport
      score={score}
      scoreLabel="교정 점수"
      meta={
        <>
          <DoneSheetMetaTag tone={detail.status === 'COMPLETED' ? 'ok' : undefined}>
            {detail.status === 'COMPLETED' ? '완료' : '진행 중'}
          </DoneSheetMetaTag>
          <span>
            오류 {detail.cleared_highlights.length}/{detail.expected_error_count}
          </span>
        </>
      }
    >
      <DoneSheetBlock label="과제">
        <p className="done-feedback">{detail.question}</p>
        <p className="done-answer is-muted">{summaryText}</p>
      </DoneSheetBlock>
      <DoneSheetBlock label="AI 응답 · 찾은 오류">
        <p className="done-feedback">
          {parts.map((part, index) =>
            part.type === 'cleared' ? (
              <mark key={index} className="highlight-cleared" title="찾은 오류">
                {part.value}
              </mark>
            ) : (
              <span key={index}>{part.value}</span>
            ),
          )}
        </p>
        {detail.cleared_highlights.length > 0 ? (
          <ul className="s-report-highlight-list">
            {detail.cleared_highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </DoneSheetBlock>
    </DoneSheetReport>
  );
}

function Stage4ReportView({
  detail,
  score,
}: {
  detail: Stage4AssignmentDetailResponse;
  score: number;
}) {
  const successCount = detail.attack_logs.filter((log) => log.attack_success).length;

  return (
    <DoneSheetReport
      score={score}
      scoreLabel="보안 체험 점수"
      meta={
        <>
          <DoneSheetMetaTag tone={detail.is_cleared ? 'ok' : undefined}>
            {detail.is_cleared ? '클리어' : '진행 중'}
          </DoneSheetMetaTag>
          <span>난이도 {detail.difficulty}</span>
          <span>
            공격 {detail.attack_logs.length}회 · 성공 {successCount}회
          </span>
        </>
      }
    >
      <DoneSheetBlock label="미션">
        <p className="done-feedback">{detail.mission}</p>
      </DoneSheetBlock>
      <DoneSheetBlock label="공격 시도 기록">
        {detail.attack_logs.length > 0 ? (
          <ul className="s-report-log-list">
            {detail.attack_logs.map((log, index) => (
              <li key={`${log.created_at ?? index}-${index}`}>
                <div className="done-sheet-meta s-report-log-meta">
                  <DoneSheetMetaTag tone={log.attack_success ? 'ok' : 'bad'}>
                    {log.attack_success ? '성공' : '실패'}
                  </DoneSheetMetaTag>
                </div>
                <p className="done-feedback">{log.attack_prompt}</p>
                {log.ai_response ? <p className="done-answer is-muted">{log.ai_response}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="done-answer is-muted">저장된 공격 시도 기록이 없습니다.</p>
        )}
      </DoneSheetBlock>
      {detail.guideline ? (
        <DoneSheetBlock label="미션 가이드">
          <p className="done-feedback">{detail.guideline}</p>
        </DoneSheetBlock>
      ) : null}
    </DoneSheetReport>
  );
}

export function StudentAssignmentReportPage() {
  const { assignmentId: rawId } = useParams<{ assignmentId: string }>();
  const assignmentId = rawId ?? '';
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo);

  const demoTask = useMemo(
    () => STUDENT_DASHBOARD_DEMO.tasks.find((task) => String(task.id) === assignmentId),
    [assignmentId],
  );

  const [loading, setLoading] = useState(useApi);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<{
    title: string;
    subjectLabel: string;
    score: number;
    stage: number;
  } | null>(null);
  const [stage1, setStage1] = useState<{
    detail: Stage1AssignmentDetailResponse;
    finalResult: Stage1FinalizeResponse;
  } | null>(null);
  const [stage2, setStage2] = useState<Stage2AssignmentDetailResponse | null>(null);
  const [stage3Result, setStage3Result] = useState<ReturnType<
    typeof buildStage3GradeResultFromDetail
  > | null>(null);
  const [stage4, setStage4] = useState<Stage4AssignmentDetailResponse | null>(null);

  useEffect(() => {
    if (!assignmentId) return;

    if (!useApi) {
      if (!demoTask || demoTask.score == null) {
        setError('리포트를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      setMeta({
        title: demoTask.title,
        subjectLabel: demoTask.subjectLabel,
        score: demoTask.score,
        stage: demoTask.stage,
      });
      if (demoTask.stage === 1) {
        setStage1({
          detail: {
            assignment_id: Number(demoTask.id),
            question: '장영실의 발명품에 대해 설명해줘.',
            parameter_explanations: {
              chunk_size: '',
              top_k: '',
              temperature: '',
            },
            default_parameters: { chunk_size: 512, top_k: 3, temperature: 0.2 },
            attempts: { used_attempts: 3, remaining_attempts: 0, max_attempts: 5 },
            is_finalized: true,
            final_attempt_number: 3,
            highest_score: demoTask.score,
            best_parameters: { chunk_size: 512, top_k: 5, temperature: 0.4 },
            correct_answer: '자격루, 측우기, 해시계, 수표 등',
            attempt_summaries: [
              {
                attempt_number: 3,
                score: demoTask.score,
                is_correct: true,
                correct_score: 100,
                resource_penalty: 12,
                feedback:
                  '핵심 발명품을 잘 짚었고, 근거 문서를 적절히 활용했습니다. temperature를 조금 낮추면 더 안정적인 답을 얻을 수 있습니다.',
                student_answer:
                  '장영실은 자격루와 측우기, 해시계 등을 만들었습니다. 세종 대 과학 기술 발전에 크게 기여했습니다.',
                parameters: { chunk_size: 512, top_k: 5, temperature: 0.4 },
                is_final: true,
              },
            ],
          },
          finalResult: {
            attempt_number: 3,
            current_score: demoTask.score,
            highest_score: demoTask.score,
            is_correct: true,
            evaluation_report: {
              is_correct: true,
              correct_score: 100,
              resource_penalty: 12,
              feedback:
                '핵심 발명품을 잘 짚었고, 근거 문서를 적절히 활용했습니다. temperature를 조금 낮추면 더 안정적인 답을 얻을 수 있습니다.',
            },
            attempts: { used_attempts: 3, remaining_attempts: 0 },
            is_finalized: true,
            correct_answer: '자격루, 측우기, 해시계, 수표 등',
          },
        });
      } else if (demoTask.stage === 2) {
        setStage2(buildDemoStage2Detail());
      } else if (demoTask.stage === 3) {
        setError('데모에서는 Stage 3 상세 리포트를 보려면 과제 페이지에서 확인해 주세요.');
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setStage1(null);
    setStage2(null);
    setStage3Result(null);
    setStage4(null);

    fetchStudentDashboardAssignmentsApi()
      .then(async (list) => {
        if (cancelled) return;
        const item = list.assignments.find((row) => String(row.assignment_id) === assignmentId);
        if (!item || item.score == null || !item.stage) {
          throw new ApiError('채점된 과제를 찾을 수 없습니다.', 404);
        }
        const nextMeta = {
          title: item.title ?? `과제 #${item.assignment_id}`,
          subjectLabel: subjectPageTitle(normalizeSubjectKey(item.subject)),
          score: item.score,
          stage: item.stage,
        };
        setMeta(nextMeta);

        if (item.stage === 1) {
          const detail = await getStudentStep1Api(assignmentId);
          const finalResult = buildStage1FinalResult(detail);
          if (!finalResult) {
            throw new ApiError('제출 기록이 없습니다.', 404);
          }
          if (!cancelled) setStage1({ detail, finalResult });
          return;
        }
        if (item.stage === 2) {
          const detail = await getStudentStep2Api(assignmentId);
          if (!cancelled) setStage2(detail);
          return;
        }
        if (item.stage === 3) {
          const detail = await getStudentStep3Api(assignmentId);
          if (!detail.submitted && detail.status !== 'COMPLETED') {
            throw new ApiError('아직 제출하지 않은 과제입니다.', 404);
          }
          if (!cancelled) setStage3Result(buildStage3GradeResultFromDetail(detail));
          return;
        }
        if (item.stage === 4) {
          const detail = await getStudentStep4Api(assignmentId);
          if (!cancelled) setStage4(detail);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '리포트를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assignmentId, useApi, demoTask]);

  if (!assignmentId) {
    return <Navigate to="/student/results" replace />;
  }

  if (loading) {
    return (
      <div className="s-assignment-report">
        <div className="shell wide">
          <p className="hint">풀이 리포트를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="s-assignment-report">
        <div className="shell wide">
          <nav className="s-report-nav">
            <Link to="/student/results" className="s-report-back">
              ← 점수 현황
            </Link>
          </nav>
          <p className="hint">{error || '리포트를 찾을 수 없습니다.'}</p>
          {demoTask?.stage === 3 ? (
            <Link to={demoTask.href} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
              과제 페이지로 이동
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ReportShell title={meta.title} subjectLabel={meta.subjectLabel}>
      {meta.stage === 1 && stage1 ? (
        <Stage1ReportView detail={stage1.detail} finalResult={stage1.finalResult} />
      ) : null}
      {meta.stage === 2 && stage2 ? <Stage2ReportView detail={stage2} score={meta.score} /> : null}
      {meta.stage === 3 && stage3Result ? <Stage3ReportView result={stage3Result} /> : null}
      {meta.stage === 4 && stage4 ? <Stage4ReportView detail={stage4} score={meta.score} /> : null}
    </ReportShell>
  );
}
