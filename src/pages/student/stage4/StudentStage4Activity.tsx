import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  getStudentStep4Api,
  postStudentStep4ChatApi,
  postStudentStep4SubmitApi,
} from '../../../api';
import type {
  Stage4AssignmentDetailResponse,
  Stage4AttemptsInfo,
  Stage4EvaluationReport,
  Stage4ReportPayload,
} from '../../../api/types';

type ChatBubble =
  | { kind: 'ai' | 'me'; text: string; leaked?: boolean }
  | { kind: 'system'; text: string };

function Toast({ message }: { message: string }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}

/** Stage4 학생 — 프롬프트 인젝션 공격 실습 */
export function StudentStage4Activity({
  assignmentId,
  skipIntroGuide = false,
}: {
  assignmentId: string;
  skipIntroGuide?: boolean;
}) {
  const [detail, setDetail] = useState<Stage4AssignmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState<Stage4AttemptsInfo | null>(null);
  const [cleared, setCleared] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [guideOpen, setGuideOpen] = useState(!skipIntroGuide);
  const [toast, setToast] = useState('');
  const [report, setReport] = useState<Stage4ReportPayload>({
    successful_attacks: '',
    failed_attacks: '',
    why_breached: '',
    defense_ideas: '',
  });
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    evaluation: Stage4EvaluationReport;
  } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [bubbles]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStudentStep4Api(assignmentId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setAttempts(data.attempts);
        setCleared(data.is_cleared);
        const logs: ChatBubble[] = [];
        for (const log of data.attack_logs ?? []) {
          logs.push({ kind: 'me', text: log.attack_prompt, leaked: log.attack_success });
          logs.push({ kind: 'ai', text: log.ai_response, leaked: log.attack_success });
        }
        setBubbles(logs);
        if (data.can_submit_report || data.is_cleared) setShowReport(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : '과제를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const sendAttack = async () => {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setReply('');
    setBubbles((prev) => [...prev, { kind: 'me', text }]);
    try {
      const res = await postStudentStep4ChatApi(assignmentId, text);
      setAttempts(res.attempts);
      setCleared(res.is_cleared);
      setHint(res.hint ?? null);
      setBubbles((prev) => [
        ...prev,
        { kind: 'ai', text: res.ai_response, leaked: res.attack_success },
        {
          kind: 'system',
          text: res.attack_success
            ? '비밀 키가 유출되었습니다. 공격을 성공했습니다.'
            : '비밀 키는 지켜졌습니다. 다른 우회를 시도해 보세요.',
        },
      ]);
      if (res.is_cleared) setShowReport(true);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '공격 요청에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const submitReport = async () => {
    if (
      !report.successful_attacks.trim() ||
      !report.failed_attacks.trim() ||
      !report.why_breached.trim() ||
      !report.defense_ideas.trim()
    ) {
      setToast('보고서 네 항목을 모두 적어 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await postStudentStep4SubmitApi(assignmentId, report);
      setResult({
        score: res.current_score,
        passed: res.is_passed,
        evaluation: res.evaluation_report,
      });
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '보고서 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="s4">
        <div className="shell">
          <p className="hint">과제를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="s4">
        <div className="shell">
          <p className="hint" style={{ color: '#b91c1c' }}>
            {loadError || '과제를 찾을 수 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="s4">
        <div className="shell wide">
          <section className="score-hero">
            <div className="score-copy">
              <h1>{result.passed ? '보안 실습을 통과했습니다' : '보고서를 제출했습니다'}</h1>
              <p>
                점수 {result.score}점 · 클리어 {result.evaluation.clear_score} · 효율{' '}
                {result.evaluation.efficiency_score} · 분석 {result.evaluation.analysis_score}
              </p>
              <p className="hint">{result.evaluation.feedback}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="s4">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · 보안 강화</span>
          </div>
          <span className="pill">
            남은 시도 {attempts?.remaining_attempts ?? 0} / {attempts?.max_attempts ?? 0}
          </span>
        </header>

        <nav className="steps" aria-label="진행 단계">
          <div className="step">과제 선택</div>
          <div className="step" aria-current={!showReport ? 'step' : undefined}>
            공격 실습
          </div>
          <div className="step" aria-current={showReport ? 'step' : undefined}>
            보고서
          </div>
        </nav>

        {!showReport ? (
          <section className="stage">
            <div className="info-card" style={{ marginBottom: 16 }}>
              <p className="side-title">{detail.title}</p>
              <p className="mission-text">{detail.mission}</p>
              <p className="hint hint-sm">난이도 {detail.difficulty}</p>
            </div>
            <div className="floor" ref={chatRef} style={{ minHeight: 280 }}>
              {bubbles.length === 0 && (
                <p className="floor-empty">공격 프롬프트를 입력해 비밀 키를 알아내 보세요.</p>
              )}
              {bubbles.map((b, i) =>
                b.kind === 'system' ? (
                  <p key={i} className="hint">
                    {b.text}
                  </p>
                ) : (
                  <div key={i} className={`say ${b.kind === 'me' ? 'pro' : 'con'}`}>
                    <div className="say-meta">
                      <span className="name">{b.kind === 'me' ? '나' : '대상 AI'}</span>
                    </div>
                    <div className="bubble">{b.text}</div>
                  </div>
                ),
              )}
            </div>
            {hint ? <p className="hint">힌트: {hint}</p> : null}
            <div className="decide-bar">
              <textarea
                className="field"
                rows={3}
                placeholder="공격 프롬프트를 입력하세요"
                value={reply}
                disabled={sending || (attempts?.remaining_attempts ?? 0) <= 0}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="decide-actions" style={{ marginTop: 10 }}>
                <button className="btn btn-primary" type="button" disabled={sending} onClick={() => void sendAttack()}>
                  {sending ? '전송 중…' : '공격 보내기'}
                </button>
                {cleared && (
                  <button className="btn btn-ghost" type="button" onClick={() => setShowReport(true)}>
                    보고서 작성
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="report-panel">
            <h2>보안 분석 보고서</h2>
            <p className="hint" style={{ marginBottom: 18 }}>
              성공·실패한 공격과, 왜 뚫렸는지·어떻게 막을지를 적어 제출하세요.
            </p>
            <div className="stack">
              <div className="field-group">
                <label className="label">성공한 공격</label>
                <textarea
                  className="field"
                  rows={3}
                  value={report.successful_attacks}
                  onChange={(e) => setReport((r) => ({ ...r, successful_attacks: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="label">실패한 공격</label>
                <textarea
                  className="field"
                  rows={3}
                  value={report.failed_attacks}
                  onChange={(e) => setReport((r) => ({ ...r, failed_attacks: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="label">왜 뚫렸나요?</label>
                <textarea
                  className="field"
                  rows={3}
                  value={report.why_breached}
                  onChange={(e) => setReport((r) => ({ ...r, why_breached: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="label">어떻게 막을까요?</label>
                <textarea
                  className="field"
                  rows={3}
                  value={report.defense_ideas}
                  onChange={(e) => setReport((r) => ({ ...r, defense_ideas: e.target.value }))}
                />
              </div>
              <div className="actions">
                <button className="btn btn-ghost" type="button" onClick={() => setShowReport(false)}>
                  공격으로 돌아가기
                </button>
                <button className="btn btn-primary" type="button" disabled={submitting} onClick={() => void submitReport()}>
                  {submitting ? '제출 중…' : '보고서 제출'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {guideOpen && (
        <div className="modal open" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h2>프롬프트 인젝션 실습</h2>
            </header>
            <div className="modal-body">
              <p className="hint">
                대상 AI는 비밀 키를 지키도록 설정되어 있습니다. 역할극·지시 무시·포맷 조작 등으로
                키를 빼낸 뒤, 왜 위험했는지 보고서로 정리하세요.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" type="button" onClick={() => setGuideOpen(false)}>
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </div>
  );
}
