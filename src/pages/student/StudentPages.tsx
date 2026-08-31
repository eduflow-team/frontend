import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  fetchStudentAttendanceApi,
  fetchStudentDashboardAssignmentsApi,
  fetchStudentDashboardSummaryApi,
  fetchStudentNoticesApi,
  getStudentStep1Api,
  getStudentStep1DocumentBlobApi,
  getStudentStep4SetApi,
  postStudentStep1ChatApi,
  postStudentStep1SubmitApi,
} from '../../api';
import type {
  Stage1AssignmentDetailResponse,
  Stage1AttemptSummary,
  Stage1EvaluationReport,
  Stage1FinalizeResponse,
  Stage1Parameters,
  Stage1SubmitResponse,
  Stage4SetScore,
} from '../../api/types';
import { STAGE1_CHUNK_SIZE_PRESETS } from '../../api/types';
import { ApiStateBody, PageHero, PlaceholderCard } from '../../components/common';
import {
  AssignmentSelectPanel,
  toSelectableAssignments,
  type SelectableAssignment,
} from '../../components/student/AssignmentSelectPanel';
import { HexLiteracyRadar } from '../../components/student/HexLiteracyRadar';
import { StageGuideModal } from '../../components/student/StageGuideModal';
import { STAGE1_HELP_INTRO, STAGE1_HELP_SECTIONS, Stage1Tour } from '../../components/student/Stage1Tour';
import {
  LITERACY_AXES,
  averageLiteracyScore,
  emptyLiteracyScores,
  literacyScoresFromApi,
} from '../../constants/literacyAxes';
import { normalizeSubjectKey } from '../../constants/assignments';
import { STAGE_TITLES, learningModeByStage, subjectPageTitle } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { StudentStage2Activity } from './stage2/StudentStage2Activity';
import { StudentStage4Activity } from './stage4/StudentStage4Activity';
import { Stage4DifficultySelect } from './stage4/Stage4DifficultySelect';
import { Stage4SetReport } from './stage4/Stage4SetReport';
import { toStage4SetList, type Stage4SetListItem } from './stage4/stage4Sets';
import { StudentStage3Activity } from './stage3/StudentStage3Activity';

type StageFlowPhase = 'guide' | 'select' | 'difficulty' | 'learn' | 'report';
type Stage4ReportMode = 'write' | 'view';

function reportFromAttempt(attempt: Stage1AttemptSummary): Stage1EvaluationReport {
  return {
    is_correct: attempt.is_correct,
    correct_score: attempt.correct_score,
    resource_penalty: attempt.resource_penalty,
    feedback: attempt.feedback,
    matched_keypoints: attempt.matched_keypoints,
    total_keypoints: attempt.total_keypoints,
    keypoint_results: attempt.keypoint_results,
  };
}

export function StudentStagePage() {
  const { stage } = useParams<{ subject?: string; stage: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const stageNum = Number(stage);
  const mode = learningModeByStage(stageNum);

  const assignmentIdParam = searchParams.get('assignmentId');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phase, setPhase] = useState<StageFlowPhase>('guide');
  const [selectedSet, setSelectedSet] = useState<Stage4SetListItem | null>(null);
  const [setScore, setSetScore] = useState<Stage4SetScore | null>(null);
  const [setScoreLoading, setSetScoreLoading] = useState(false);
  const [setScoreError, setSetScoreError] = useState<string | null>(null);
  const [reportMode, setReportMode] = useState<Stage4ReportMode>('write');

  const useAssignmentsApi = Boolean(user);
  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], useAssignmentsApi);

  useEffect(() => {
    setPhase('guide');
    setActiveId(null);
    setSelectedSet(null);
    setSetScore(null);
    setSetScoreError(null);
  }, [stageNum]);

  useEffect(() => {
    if (stageNum !== 4 || !selectedSet) return;
    if (phase !== 'difficulty' && phase !== 'report') return;

    let cancelled = false;
    setSetScoreLoading(true);
    setSetScoreError(null);
    getStudentStep4SetApi(selectedSet.entryAssignmentId)
      .then((data) => {
        if (!cancelled) setSetScore(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setSetScore(null);
          setSetScoreError(
            err instanceof ApiError ? err.message : '난이도를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSetScoreLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stageNum, phase, selectedSet]);

  if (!mode || Number.isNaN(stageNum) || stageNum < 1 || stageNum > 4) {
    return <Navigate to="/student" replace />;
  }

  const selectAssignment = (id: string) => {
    setActiveId(id);
    setSearchParams({ assignmentId: id });
    setPhase('learn');
  };

  const selectStage4Set = (setItem: Stage4SetListItem) => {
    setSelectedSet(setItem);
    setSetScore(null);
    setPhase('difficulty');
  };

  const apiList = toSelectableAssignments(assignments.data?.assignments, stageNum);
  const stage4Sets = toStage4SetList(assignments.data?.assignments);
  const selectableList: SelectableAssignment[] = (() => {
    if (stageNum === 4) {
      return stage4Sets.map((s) => ({
        id: s.key,
        title: s.title,
        statusLabel: s.statusLabel,
        meta: s.meta,
      }));
    }
    return apiList;
  })();

  const handleGuideContinue = () => {
    const idFromUrl = assignmentIdParam?.trim();
    if (idFromUrl) {
      selectAssignment(idFromUrl);
      return;
    }
    if (selectableList.length >= 1) {
      selectAssignment(String(selectableList[0].id));
      return;
    }
    setPhase('select');
  };

  const guideBusy = useAssignmentsApi && assignments.loading && !assignmentIdParam?.trim();

  const emptyMessage = '배정된 과제가 없습니다. 선생님이 과제를 게시하면 여기에 표시됩니다.';

  /* ── Guide popup ── */
  if (phase === 'guide') {
    return (
      <div className="stage-assign-shell">
        <StageGuideModal
          stage={stageNum}
          onContinue={handleGuideContinue}
          busy={guideBusy}
          busyLabel="과제 불러오는 중…"
        />
      </div>
    );
  }

  /* ── Stage4 difficulty select ── */
  if (stageNum === 4 && phase === 'difficulty' && selectedSet) {
    return (
      <div className="stage-assign-shell">
        <div className="shell wide">
          <Stage4DifficultySelect
            setTitle={selectedSet.title}
            setScore={setScore}
            loading={setScoreLoading}
            error={setScoreError}
            onBack={() => {
              setPhase('select');
              setSelectedSet(null);
              setSetScore(null);
            }}
            onSelect={(assignmentId) => selectAssignment(assignmentId)}
            onWriteReport={() => {
              setReportMode('write');
              setPhase('report');
            }}
            onViewReport={() => {
              setReportMode('view');
              setPhase('report');
            }}
          />
        </div>
      </div>
    );
  }

  if (stageNum === 4 && phase === 'report' && selectedSet) {
    return (
      <Stage4SetReport
        entryAssignmentId={selectedSet.entryAssignmentId}
        setTitle={selectedSet.title}
        initialMode={reportMode}
        onBack={() => {
          setPhase('difficulty');
          void getStudentStep4SetApi(selectedSet.entryAssignmentId).then(setSetScore);
        }}
        onSubmitted={(next) => setSetScore(next)}
      />
    );
  }

  /* ── Assignment select ── */
  if (phase === 'select' || !activeId) {
    return (
      <div className="stage-assign-shell">
        <div className="shell wide">
          <AssignmentSelectPanel
            moduleName={mode.module}
            contentDesc={STAGE_TITLES[stageNum]}
            loading={useAssignmentsApi && assignments.loading && selectableList.length === 0}
            error={useAssignmentsApi ? assignments.error : null}
            assignments={selectableList}
            emptyMessage={emptyMessage}
            onSelect={(id) => {
              if (stageNum === 4) {
                const setItem = stage4Sets.find((s) => s.key === id);
                if (setItem) {
                  selectStage4Set(setItem);
                  return;
                }
                selectAssignment(id);
                return;
              }
              selectAssignment(id);
            }}
          />
        </div>
      </div>
    );
  }

  /* ── Learn ── */
  if (stageNum === 1) {
    return (
      <div className="s1">
        <div className="shell wide">
          <nav className="steps" aria-label="진행 단계">
            <div className="step">안내</div>
            <div className="step">과제 선택</div>
            <div className="step" aria-current="step">
              학습
            </div>
            <div className="step">결과</div>
          </nav>
          <StudentStage1Activity assignmentId={activeId} />
        </div>
      </div>
    );
  }

  if (stageNum === 2) {
    return <StudentStage2Activity assignmentId={activeId} />;
  }

  if (stageNum === 3) {
    return <StudentStage3Activity assignmentId={activeId} skipIntroGuide />;
  }

  if (stageNum === 4) {
    return (
      <StudentStage4Activity
        assignmentId={activeId}
        onBack={() => {
          setActiveId(null);
          setSearchParams({});
          setPhase('difficulty');
          if (selectedSet) {
            void getStudentStep4SetApi(selectedSet.entryAssignmentId).then(setSetScore);
          }
        }}
      />
    );
  }

  return (
    <div className="s1">
      <div className="shell wide">
        <p className="hint">지원하지 않는 단계입니다.</p>
      </div>
    </div>
  );
}



interface Stage1ChatBubble {
  role: 'user' | 'bot';
  text: string;
  meta?: string;
  /** AI가 top-k로 참고한 문장 (정리된 preview) */
  references?: string[];
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
  const [params, setParams] = useState<Stage1Parameters | null>(null);
  const [messages, setMessages] = useState<Stage1ChatBubble[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [lastTopkRefs, setLastTopkRefs] = useState<string[]>([]);
  const [topkOpen, setTopkOpen] = useState(false);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitResult, setSubmitResult] = useState<Stage1SubmitResponse | null>(null);
  const [attemptSummaries, setAttemptSummaries] = useState<Stage1AttemptSummary[]>([]);
  const [finalResult, setFinalResult] = useState<Stage1FinalizeResponse | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  const [docObjectUrl, setDocObjectUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');
  const [toast, setToast] = useState('');
  const [done, setDone] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const chatLogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setDetail(null);
    setParams(null);
    setMessages([]);
    setLastTopkRefs([]);
    setTopkOpen(false);
    setStudentAnswer('');
    setChatInput('');
    setSubmitResult(null);
    setAttemptSummaries([]);
    setFinalResult(null);
    setDone(false);
    setTourOpen(false);
    getStudentStep1Api(assignmentId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        setParams({ ...res.default_parameters });
        const summaries = res.attempt_summaries ?? [];
        setAttemptSummaries(summaries);
        if (res.is_finalized) {
          const finalAttempt =
            summaries.find((a) => a.is_final) ??
            summaries.find((a) => a.attempt_number === res.final_attempt_number) ??
            summaries[summaries.length - 1];
          if (finalAttempt) {
            setFinalResult({
              attempt_number: finalAttempt.attempt_number,
              current_score: finalAttempt.score,
              highest_score: finalAttempt.score,
              is_correct: finalAttempt.is_correct,
              evaluation_report: reportFromAttempt(finalAttempt),
              attempts: {
                used_attempts: res.attempts.used_attempts,
                remaining_attempts: res.attempts.remaining_attempts,
              },
              attempt_summaries: summaries,
              is_finalized: true,
              correct_answer: res.correct_answer,
            });
            setDone(true);
          }
        } else if (summaries.length > 0) {
          setTourOpen(true);
        } else {
          setTourOpen(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setParams(null);
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

  useEffect(() => {
    if (!fileOpen) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setDocLoading(true);
    setDocError('');
    setDocObjectUrl(null);
    getStudentStep1DocumentBlobApi(assignmentId)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setDocObjectUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setDocError(err instanceof ApiError ? err.message : '학습 자료를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileOpen, assignmentId]);

  useEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, chatBusy]);

  const maxAttempts = detail?.attempts.max_attempts;
  const usedAttempts = detail?.attempts.used_attempts ?? 0;
  const remaining = detail?.attempts.remaining_attempts ?? 0;

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!params) {
      setToast('과제 파라미터를 불러오는 중입니다.');
      return;
    }
    if (!text) {
      setToast('AI에게 물어볼 내용을 입력해 주세요.');
      return;
    }
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');
    setChatBusy(true);
    try {
      const res = await postStudentStep1ChatApi(assignmentId, {
        message: text,
        parameters: params,
      });
      const viz = res.rag_process_visualization;
      const refs = viz.retrieved_chunk_previews ?? [];
      setLastTopkRefs(refs);
      setMessages((prev) => [...prev, { role: 'bot', text: res.ai_response, references: refs }]);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '채팅 요청에 실패했습니다.');
    } finally {
      setChatBusy(false);
    }
  };

  const submit = async () => {
    if (!params) {
      setToast('과제 파라미터를 불러오는 중입니다.');
      return;
    }
    if (!studentAnswer.trim()) {
      setToast('제출할 답을 입력해 주세요.');
      return;
    }
    if (studentAnswer.trim().length < 20) {
      setToast('답안은 20자 이상 작성해 주세요. 핵심 요점을 짧게 정리해 보세요.');
      return;
    }
    if (remaining <= 0) {
      setToast('제출 기회를 모두 사용했습니다.');
      return;
    }
    if (detail?.is_finalized) {
      setToast('이미 최종 제출이 확정되었습니다.');
      return;
    }
    setSubmitBusy(true);
    try {
      const res = await postStudentStep1SubmitApi(assignmentId, {
        final_parameters: params,
        student_answer: studentAnswer.trim(),
      });
      setSubmitResult(res);
      const summaries = res.attempt_summaries ?? [];
      setAttemptSummaries(summaries);
      const chosen = summaries.find((a) => a.is_final) ?? summaries[summaries.length - 1];
      if (detail) {
        setDetail({
          ...detail,
          attempts: {
            ...detail.attempts,
            used_attempts: res.attempts.used_attempts,
            remaining_attempts: res.attempts.remaining_attempts,
          },
          attempt_summaries: summaries,
          highest_score: res.highest_score,
          is_finalized: Boolean(res.is_finalized),
          final_attempt_number: res.is_finalized ? res.attempts.used_attempts : detail.final_attempt_number,
          best_parameters: res.is_finalized ? chosen?.parameters ?? params : detail.best_parameters,
          is_answer_revealed: Boolean(res.correct_answer) || detail.is_answer_revealed,
          correct_answer: res.correct_answer ?? detail.correct_answer,
        });
      }
      setStudentAnswer('');

      if (res.is_finalized) {
        const winner =
          summaries.find((a) => a.is_final) ??
          summaries.reduce<Stage1AttemptSummary | null>((best, cur) => {
            if (!best || cur.score > best.score) return cur;
            return best;
          }, null);
        if (winner) {
          const report =
            winner.attempt_number === res.attempts.used_attempts
              ? res.evaluation_report
              : reportFromAttempt(winner);
          setFinalResult({
            attempt_number: winner.attempt_number,
            current_score: winner.score,
            highest_score: winner.score,
            is_correct: winner.is_correct,
            evaluation_report: report,
            attempts: res.attempts,
            attempt_summaries: summaries,
            is_finalized: true,
            correct_answer: res.correct_answer,
          });
        }
        setDone(true);
        if (res.is_correct && winner?.attempt_number === res.attempts.used_attempts) {
          setToast('모든 핵심 요점을 맞혔어요! 최종 제출이 확정되었어요.');
        } else if (summaries.length > 1 && winner) {
          setToast(
            `제출이 끝났어요. ${winner.attempt_number}번째 제출(${winner.score}점)이 더 높아 최종 점수로 확정됐어요.`,
          );
        } else {
          setToast('최종 제출이 확정되었어요.');
        }
      } else {
        const matched = res.evaluation_report.matched_keypoints ?? 0;
        const total = res.evaluation_report.total_keypoints ?? 3;
        if (matched > 0) {
          setToast(
            `핵심 요점 ${matched}/${total}개 반영. 파라미터를 조정해 한 번 더 보완할 수 있어요.`,
          );
        } else {
          setToast('핵심 요점이 부족해요. 파라미터를 조정해 한 번 더 도전할 수 있어요.');
        }
      }
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '제출에 실패했습니다.');
    } finally {
      setSubmitBusy(false);
    }
  };

  if (loading) {
    return <p className="hint">과제 불러오는 중…</p>;
  }
  if (loadError || !detail || !params || maxAttempts == null) {
    return <p className="hint">{loadError || '과제 정보가 없습니다.'}</p>;
  }

  if (done && finalResult) {
    const chosen =
      attemptSummaries.find((a) => a.attempt_number === finalResult.attempt_number) ??
      attemptSummaries.find((a) => a.is_final);
    const shownParams = chosen?.parameters ?? detail.best_parameters ?? params;
    const answerText = finalResult.correct_answer || detail.correct_answer;
    const keypointResults = finalResult.evaluation_report.keypoint_results ?? [];
    const matchedCount = finalResult.evaluation_report.matched_keypoints;
    const totalCount = finalResult.evaluation_report.total_keypoints;
    return (
      <section className="done-layout">
        <article className="done-sheet">
          <header className="done-sheet-score">
            <p className="done-sheet-label">최종 점수</p>
            <p className="done-sheet-points">
              <strong>{finalResult.highest_score}</strong>
              <span>점</span>
            </p>
            <div className="done-sheet-meta">
              <span className={finalResult.is_correct ? 'is-ok' : 'is-bad'}>
                {finalResult.is_correct
                  ? '핵심 요점 모두 반영'
                  : typeof matchedCount === 'number' && typeof totalCount === 'number' && totalCount > 0
                    ? `요점 ${matchedCount}/${totalCount}`
                    : '부분 반영'}
              </span>
              <span>최종 {finalResult.attempt_number}회차</span>
              <span>리소스 감점 {finalResult.evaluation_report.resource_penalty}</span>
            </div>
          </header>

          <div className="done-sheet-body">
            <div className="done-sheet-block">
              <p className="done-sheet-kicker">제출 답안</p>
              <p className="done-feedback done-feedback-report">{chosen?.student_answer || '—'}</p>
            </div>
            <div className="done-sheet-block">
              <p className="done-sheet-kicker">제출 파라미터</p>
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
            </div>

            <div className="done-sheet-block">
              <p className="done-sheet-kicker">피드백</p>
              <p className="done-feedback">{finalResult.evaluation_report.feedback}</p>
              {keypointResults.length > 0 ? (
                <ul className="keypoint-check-list" aria-label="핵심 요점 채점">
                  {keypointResults.map((kp) => (
                    <li key={`done-kp-${kp.index}`} className={kp.matched ? 'is-hit' : 'is-miss'}>
                      <span className="keypoint-check-mark" aria-hidden="true">
                        {kp.matched ? '✓' : '·'}
                      </span>
                      <span>
                        {kp.matched && kp.keypoint
                          ? `${kp.index}. ${kp.keypoint}`
                          : `요점 ${kp.index}${kp.matched ? '' : ' — 아직 부족'}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {answerText ? (
                <p className="done-answer">
                  정답 키포인트
                  <strong className="done-answer-multiline">{answerText}</strong>
                </p>
              ) : (
                <p className="done-answer is-muted">정답 키포인트는 마감 후에 공개됩니다.</p>
              )}
            </div>
          </div>
        </article>
      </section>
    );
  }

  return (
    <>
      <section className="mission-banner" data-tour="s1-tour-mission">
        <div className="mission-banner-row">
          <div className="mission-banner-body">
            <div className="mission-label-row">
              <span className="mission-q" aria-hidden="true">
                Q
              </span>
              <p className="side-title">문제</p>
            </div>
            <p className="mission-text">{detail.question}</p>
            <p className="mission-due">마감 · {formatDueLabel(detail.due_at)}</p>
          </div>
          <button
            className="btn btn-ghost mission-doc-btn"
            type="button"
            data-tour="s1-tour-doc"
            onClick={() => setFileOpen(true)}
            disabled={!detail.document_url && !detail.document_filename}
            title={detail.document_filename || '학습 자료'}
          >
            <span className="mission-doc-badge" aria-hidden="true">
              {fileExtBadge(detail.document_filename)}
            </span>
            학습 자료
          </button>
        </div>
      </section>

      <div className="main-head">
        <div className="main-head-title-row">
          <h1>AI와 대화로 힌트 받기</h1>
          <button
            type="button"
            className="help-circle-btn"
            aria-label="시나리오 1 도움말"
            title="시나리오 1 도움말"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
        </div>
      </div>

      <div className="layout-split">
        <aside className="side">
          <section className="info-card info-card-params" data-tour="s1-tour-params">
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
                  onChange={(e) => {
                    const chunk_size = Number(e.target.value);
                    setParams((p) => (p ? { ...p, chunk_size } : p));
                  }}
                >
                  {STAGE1_CHUNK_SIZE_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group param" data-tour="s1-tour-topk">
                <label className="label" htmlFor="p-topk">
                  top_k
                </label>
                <div className="topk-row">
                  <input
                    id="p-topk"
                    className="field"
                    type="number"
                    min={1}
                    max={50}
                    value={params.top_k}
                    onChange={(e) => {
                      const top_k = Number(e.target.value);
                      setParams((p) => (p ? { ...p, top_k } : p));
                    }}
                  />
                  <button
                    className="btn btn-ghost btn-small topk-detail-btn"
                    type="button"
                    disabled={lastTopkRefs.length === 0}
                    onClick={() => setTopkOpen(true)}
                  >
                    top-k 자세히 보기
                  </button>
                </div>
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
                  onChange={(e) => {
                    const temperature = Number(e.target.value);
                    setParams((p) => (p ? { ...p, temperature } : p));
                  }}
                />
              </div>
            </div>
          </section>
        </aside>

        <section className="s1-main">
          <div className="chat" data-tour="s1-tour-chat">
            <div className="chat-log" aria-live="polite" ref={chatLogRef}>
              {messages.length === 0 && !chatBusy && (
                <p className="hint">학습 자료와 문제를 바탕으로 AI에게 자유롭게 질문해 보세요.</p>
              )}
              {messages.map((m, i) => (
                <article key={`${m.role}-${i}`} className={`bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
                  <div className="meta">
                    <span>{m.role === 'user' ? '나' : 'AI'}</span>
                    {m.meta ? <span className="select-hint">{m.meta}</span> : null}
                  </div>
                  <div>{m.text}</div>
                </article>
              ))}
              {chatBusy && (
                <article className="bubble ai bubble-loading" aria-busy="true" aria-label="AI 답변 로딩 중">
                  <div className="meta">
                    <span>AI</span>
                  </div>
                  <div className="loading-line">
                    <span className="loading-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </article>
              )}
            </div>
            <div className="chat-compose">
              <input
                className="field"
                type="text"
                value={chatInput}
                placeholder={chatBusy ? 'AI 답변을 기다리는 중…' : 'AI에게 질문 입력'}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
                disabled={chatBusy}
              />
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void sendChat()}
                disabled={chatBusy}
              >
                {chatBusy ? '답변 중' : '전송'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="submit-bar" data-tour="s1-tour-submit">
        <div className="submit-bar-head">
          <p className="side-title">내 답안 제출</p>
          <span className="pill">
            {usedAttempts}/{maxAttempts}회
          </span>
        </div>
        <p className="submit-bar-hint">
          AI 힌트를 모아 핵심 요점 3가지를 짧게 정리해 작성하세요. (20자 이상)
        </p>
        <div className="submit-bar-row submit-bar-row-report">
          <textarea
            id="s1-student-answer"
            className="field"
            rows={4}
            placeholder={'예:\n1) …\n2) …\n3) …'}
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            disabled={remaining <= 0 || Boolean(detail.is_finalized)}
            aria-label="내 답안"
          />
          <button
            className="btn btn-primary"
            type="button"
            disabled={
              !studentAnswer.trim() || submitBusy || remaining <= 0 || Boolean(detail.is_finalized)
            }
            onClick={() => void submit()}
          >
            {submitBusy ? '채점 중…' : remaining <= 0 ? '기회 소진' : '제출'}
          </button>
        </div>
        {attemptSummaries.length > 0 && !detail.is_finalized ? (
          <p className="submit-bar-note">
            아직 요점이 부족해요. 파라미터를 바꿔 자료를 더 찾은 뒤 한 번 더 제출할 수 있어요. (
            {usedAttempts}/{maxAttempts}회 사용)
          </p>
        ) : null}
      </div>

      {submitResult && !detail.is_finalized && (
        <div className="result show">
          <div className="score-row">
            <strong>{submitResult.current_score}</strong>
            <span>
              점 ·{' '}
              {submitResult.is_correct
                ? '핵심 요점 모두 반영'
                : `요점 ${submitResult.evaluation_report.matched_keypoints ?? 0}/${submitResult.evaluation_report.total_keypoints ?? 3}`}
            </span>
          </div>
          <p className="hint">
            정답점수 {submitResult.evaluation_report.correct_score} · 리소스 감점{' '}
            {submitResult.evaluation_report.resource_penalty}
          </p>
          <p className="hint">{submitResult.evaluation_report.feedback}</p>
          {(submitResult.evaluation_report.keypoint_results?.length ?? 0) > 0 ? (
            <ul className="keypoint-check-list" aria-label="핵심 요점 채점">
              {submitResult.evaluation_report.keypoint_results!.map((kp) => (
                <li key={`result-kp-${kp.index}`} className={kp.matched ? 'is-hit' : 'is-miss'}>
                  <span className="keypoint-check-mark" aria-hidden="true">
                    {kp.matched ? '✓' : '·'}
                  </span>
                  <span>
                    {kp.matched && kp.keypoint
                      ? `${kp.index}. ${kp.keypoint}`
                      : `요점 ${kp.index}${kp.matched ? '' : ' — 아직 부족'}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {remaining > 0 ? (
            <p className="hint">
              요점 3개를 모두 맞히면 바로 최종 제출됩니다. 두 번 모두 쓰면 점수가 더 높은 제출이 최종이
              돼요.
            </p>
          ) : null}
        </div>
      )}

      <Stage1Tour open={tourOpen} onFinish={() => setTourOpen(false)} />

      <div
        className={`modal${helpOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="시나리오 1 도움말"
        onClick={(e) => {
          if (e.target === e.currentTarget) setHelpOpen(false);
        }}
      >
        <div className="modal-card modal-card-help">
          <header>
            <h2>시나리오 1 도움말</h2>
            <button className="btn btn-ghost" type="button" onClick={() => setHelpOpen(false)}>
              닫기
            </button>
          </header>
          <div className="help-body">
            <p className="help-intro">{STAGE1_HELP_INTRO}</p>
            <div className="help-sections">
              {STAGE1_HELP_SECTIONS.map((section) => (
                <article key={section.title} className="help-section">
                  <div className="help-section-head">
                    <span className="help-where">{section.where}</span>
                    <h3>{section.title}</h3>
                  </div>
                  <ul className="help-bullets">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {section.tip ? <p className="help-tip">{section.tip}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`modal${fileOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setFileOpen(false);
        }}
      >
        <div className="modal-card modal-card-doc">
          <header>
            <h2>{detail.document_filename || '학습 자료'}</h2>
            <button className="btn btn-ghost" type="button" onClick={() => setFileOpen(false)}>
              닫기
            </button>
          </header>
          {docLoading ? (
            <div className="doc-viewer-state">학습 자료를 불러오는 중…</div>
          ) : docError ? (
            <div className="doc-viewer-state">{docError}</div>
          ) : docObjectUrl ? (
            <iframe
              className="doc-frame"
              title={detail.document_filename || '학습 자료'}
              src={docObjectUrl}
            />
          ) : (
            <div className="doc-viewer-state">원문을 불러올 수 없습니다.</div>
          )}
        </div>
      </div>

      <div
        className={`modal${topkOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setTopkOpen(false);
        }}
      >
        <div className="modal-card">
          <header>
            <h2>top-k로 참고한 문장 ({lastTopkRefs.length}개)</h2>
            <button className="btn btn-ghost" type="button" onClick={() => setTopkOpen(false)}>
              닫기
            </button>
          </header>
          {lastTopkRefs.length > 0 ? (
            <ol className="topk-modal-list">
              {lastTopkRefs.map((ref, idx) => (
                <li key={`topk-modal-${idx}`}>{ref}</li>
              ))}
            </ol>
          ) : (
            <div className="doc-viewer-state">아직 참고 문장이 없습니다. AI에게 먼저 질문해 보세요.</div>
          )}
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
  const useApi = Boolean(user);
  const summary = useFetch(fetchStudentDashboardSummaryApi, [], useApi);
  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], useApi);

  const loading = useApi && (summary.loading || assignments.loading);
  const error = useApi ? summary.error || assignments.error : null;

  const axes = (() => {
    if (!useApi || !summary.data) return emptyLiteracyScores();
    return literacyScoresFromApi(summary.data.literacy_axes);
  })();

  const total = summary.data?.literacy_total ?? averageLiteracyScore(axes);

  const scoredTasks = useMemo(() => {
    if (useApi && assignments.data) {
      return assignments.data.assignments
        .filter((item) => item.score != null)
        .map((item) => ({
          id: item.assignment_id,
          title: item.title ?? `과제 #${item.assignment_id}`,
          subjectLabel: subjectPageTitle(normalizeSubjectKey(item.subject)),
          score: item.score as number,
        }))
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ko'));
    }
    return [];
  }, [useApi, assignments.data]);

  const insight = useMemo(() => {
    const scored = LITERACY_AXES.map((axis) => ({
      label: axis.label,
      score: axes[axis.key],
    })).filter((item): item is { label: string; score: number } => item.score != null);
    if (scored.length < 2) return null;
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    return { strong: sorted[0], weak: sorted[sorted.length - 1] };
  }, [axes]);

  return (
    <div className="s-dash s-results">
      <div className="shell wide">
        {loading ? (
          <p className="hint">점수를 불러오는 중…</p>
        ) : error ? (
          <p className="hint">{error}</p>
        ) : (
          <>
            <header className="s-results-hero">
              <div className="s-results-hero-main">
                <p className="done-eyebrow">울산형 AI 리터러시</p>
                <div className="s-results-score-block">
                  <p className="s-results-total" aria-label={`총점 ${total}점`}>
                    <strong>{total}</strong>
                    <span>점</span>
                  </p>
                  <p className="s-results-meta">6개 역량 평균 · 미이수 제외</p>
                </div>
              </div>
              <div className="s-results-hero-aside">
                {insight ? (
                  <p className="s-results-insight">
                    강점 <strong>{insight.strong.label}</strong>
                    {' · '}
                    더 키울 것 <strong>{insight.weak.label}</strong>
                  </p>
                ) : null}
                <p className="hint s-results-desc">
                  과제를 완료하면 연결된 역량 점수가 반영됩니다.
                </p>
              </div>
            </header>

            <div className="s-results-literacy">
              <section className="info-card s-results-hex">
                <div className="info-card-head">
                  <span className="info-icon" aria-hidden="true">
                    ⬡
                  </span>
                  <p className="side-title">역량 프로필</p>
                </div>
                <HexLiteracyRadar scores={axes} />
              </section>

              <section className="info-card s-results-axes">
                <div className="info-card-head">
                  <span className="info-icon" aria-hidden="true">
                    ▤
                  </span>
                  <p className="side-title">역량별 점수</p>
                </div>
                <ul className="skill-bars">
                  {LITERACY_AXES.map((axis) => {
                    const score = axes[axis.key];
                    const pct = score ?? 0;
                    return (
                      <li key={axis.key}>
                        <div className="skill-bar-top">
                          <span>{axis.label}</span>
                          <strong>{score != null ? score : '—'}</strong>
                        </div>
                        <div className="skill-bar-track">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            <section className="info-card s-results-assignments">
              <div className="info-card-head">
                <span className="info-icon" aria-hidden="true">
                  ◎
                </span>
                <p className="side-title">과제별 점수</p>
                <span className="s-results-task-count">{scoredTasks.length}개</span>
              </div>
              {scoredTasks.length === 0 ? (
                <p className="hint s-results-empty">채점된 과제가 없습니다.</p>
              ) : (
                <ul className="s-results-task-scores">
                  {scoredTasks.map((task) => (
                    <li key={task.id}>
                      <Link
                        to={`/student/results/${task.id}`}
                        className="s-results-task-row s-results-task-link"
                      >
                        <div className="s-results-task-main">
                          <p className="s-results-task-title">{task.title}</p>
                          <span className="s-results-task-subject">{task.subjectLabel}</span>
                        </div>
                        <strong className="s-results-task-score">{task.score}점</strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export function StudentAttendancePage() {
  const { user } = useAuth();
  const useApi = Boolean(user);
  const { data, loading, error } = useFetch(fetchStudentAttendanceApi, [], useApi);

  if (!useApi) {
    return (
      <>
        <PageHero title="출석" description="수업 참여 기록을 확인합니다." />
        <PlaceholderCard title="출석 현황" message="로그인이 필요합니다." />
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
  const useApi = Boolean(user);
  const { data, loading, error } = useFetch(fetchStudentNoticesApi, [], useApi);

  if (!useApi) {
    return (
      <>
        <PageHero title="공지사항" description="선생님이 등록한 공지를 확인합니다." />
        <PlaceholderCard title="공지 목록" message="로그인이 필요합니다." />
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
