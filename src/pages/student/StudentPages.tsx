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
import { ApiStateBody, PageHero, PlaceholderCard } from '../../components/common';
import { STAGE_TITLES, STUDENT_SUBJECTS } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import type { SubjectKey } from '../../types';
import { PROGRESS_LABELS } from '../../utils/labels';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export function StudentStagePage() {
  const { subject, stage } = useParams<{ subject: SubjectKey; stage: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const subjectData = STUDENT_SUBJECTS.find((s) => s.key === subject);
  const stageNum = Number(stage);
  const activity = subjectData?.activities.find((a) => a.stage === stageNum);
  const useApi = user && !user.isDemo && (stageNum === 1 || stageNum === 2);

  const assignmentIdParam = searchParams.get('assignmentId');
  const [assignmentIdInput, setAssignmentIdInput] = useState(assignmentIdParam ?? '');
  const [activeId, setActiveId] = useState<string | null>(assignmentIdParam);
  const [loadError, setLoadError] = useState('');
  const [loadInfo, setLoadInfo] = useState('');
  const [loadingStep, setLoadingStep] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [highlightText, setHighlightText] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  const assignments = useFetch(
    fetchStudentDashboardAssignmentsApi,
    [],
    Boolean(useApi),
  );

  useEffect(() => {
    if (assignmentIdParam) {
      setActiveId(assignmentIdParam);
      setAssignmentIdInput(assignmentIdParam);
    }
  }, [assignmentIdParam]);

  useEffect(() => {
    if (!useApi || !activeId) return;
    let cancelled = false;
    setLoadingStep(true);
    setLoadError('');
    setLoadInfo('');
    const loader = stageNum === 1 ? getStudentStep1Api : getStudentStep2Api;
    loader(activeId)
      .then((res) => {
        if (cancelled) return;
        setLoadInfo(
          res.status === 'success'
            ? '과제 데이터를 불러왔습니다. (백엔드 스텁이면 내용이 비어 있을 수 있습니다.)'
            : '과제를 불러왔습니다.',
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : '과제를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStep(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useApi, activeId, stageNum]);

  if (!subjectData || !activity || Number.isNaN(stageNum) || stageNum < 1 || stageNum > 4) {
    return <Navigate to="/student" replace />;
  }

  if (!useApi) {
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
    setMessages([]);
    setActionMsg('');
    setActionErr('');
  };

  const sendChat = async () => {
    if (!activeId || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setChatBusy(true);
    setActionErr('');
    try {
      const res = await postStudentStep1ChatApi(activeId, { message: text });
      const reply =
        typeof res.data?.reply === 'string'
          ? res.data.reply
          : typeof res.data?.message === 'string'
            ? res.data.message
            : JSON.stringify(res.data ?? res);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: reply || '(스텁 응답: 내용 없음)' },
      ]);
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '채팅 요청에 실패했습니다.');
    } finally {
      setChatBusy(false);
    }
  };

  const submitStep1 = async () => {
    if (!activeId) return;
    setActionErr('');
    setActionMsg('');
    try {
      await postStudentStep1SubmitApi(activeId, {
        answer: messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n'),
      });
      setActionMsg('제출이 완료되었습니다.');
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '제출에 실패했습니다.');
    }
  };

  const submitHighlight = async () => {
    if (!activeId || !highlightText.trim()) return;
    setActionErr('');
    setActionMsg('');
    try {
      await postStudentStep2HighlightApi(activeId, { text: highlightText.trim() });
      setActionMsg('하이라이트가 저장되었습니다.');
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '저장에 실패했습니다.');
    }
  };

  const submitCorrection = async () => {
    if (!activeId || !correctionText.trim()) return;
    setActionErr('');
    setActionMsg('');
    try {
      await postStudentStep2CorrectionApi(activeId, { explanation: correctionText.trim() });
      setActionMsg('교정 설명이 제출되었습니다.');
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : '제출에 실패했습니다.');
    }
  };

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
                placeholder="예: 1"
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
          {loadingStep && <p className="inline-alert">과제 불러오는 중…</p>}
          {loadInfo && <p className="inline-alert ok">{loadInfo}</p>}
          {loadError && <p className="inline-alert error">{loadError}</p>}
        </div>
      </div>

      {!activeId ? (
        <PlaceholderCard title="활동을 시작하려면 과제를 선택하세요" />
      ) : stageNum === 1 ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">AI 답 실험 · 채팅</span>
          </div>
          <div className="card-body">
            <div className="chat-log">
              {messages.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  질문을 보내면 AI 응답이 여기에 표시됩니다.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={`${m.role}-${i}`} className={`chat-bubble ${m.role}`}>
                  {m.text}
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
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void submitStep1()}>
                활동 제출
              </button>
            </div>
            {actionMsg && <p className="inline-alert ok">{actionMsg}</p>}
            {actionErr && <p className="inline-alert error">{actionErr}</p>}
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">틀린 부분 표시</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label" htmlFor="highlight">
                  하이라이트할 문장
                </label>
                <textarea
                  id="highlight"
                  className="form-control"
                  rows={5}
                  value={highlightText}
                  onChange={(e) => setHighlightText(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void submitHighlight()}>
                하이라이트 저장
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">교정 · 설명</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label" htmlFor="correction">
                  왜 틀렸는지 설명
                </label>
                <textarea
                  id="correction"
                  className="form-control"
                  rows={5}
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void submitCorrection()}>
                설명 제출
              </button>
              {actionMsg && <p className="inline-alert ok">{actionMsg}</p>}
              {actionErr && <p className="inline-alert error">{actionErr}</p>}
            </div>
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
        description={`출석률 ${Math.round((data?.attendance_rate ?? 0) * 100)}% · 출석 ${data?.present_count ?? 0} · 지각 ${data?.late_count ?? 0} · 결석 ${data?.absent_count ?? 0}`}
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
