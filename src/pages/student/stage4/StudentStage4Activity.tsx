import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  getStudentStep4Api,
  postStudentStep4ChatApi,
} from '../../../api';
import type { Stage4AssignmentDetailResponse } from '../../../api/types';
import { Stage4HintsList, countUnlockedHints } from './Stage4HintsList';
import { Stage4Tour } from './Stage4Tour';

function Toast({ message }: { message: string }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}

interface StudentStage4ActivityProps {
  assignmentId: string;
  onBack: () => void;
}

/** Stage4 학생 — 프롬프트 인젝션 공격 실습 (난이도 선택은 이전 화면에서만) */
export function StudentStage4Activity({ assignmentId, onBack }: StudentStage4ActivityProps) {
  const [detail, setDetail] = useState<Stage4AssignmentDetailResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attackInput, setAttackInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [tourOpen, setTourOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const loadDetail = useCallback(async (id: string, opts?: { openTour?: boolean }) => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getStudentStep4Api(id);
      setDetail(data);
      if (opts?.openTour) setTourOpen(true);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : '과제를 불러오지 못했습니다.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAttackInput('');
    setTourOpen(false);
    void loadDetail(assignmentId, { openTour: true });
  }, [assignmentId, loadDetail]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [detail?.attack_logs]);

  const sendAttack = async () => {
    if (!detail || chatBusy) return;
    const prompt = attackInput.trim();
    if (!prompt) {
      setToast('공격 문장을 입력해 주세요');
      return;
    }
    if (!detail.unlocked) {
      setToast('잠긴 난이도입니다');
      return;
    }
    if (detail.set.report_submitted) {
      setToast('보고서를 이미 제출했습니다');
      return;
    }
    if (detail.attempts.remaining_attempts <= 0) {
      setToast('시도 횟수를 모두 사용했습니다');
      return;
    }

    setChatBusy(true);
    try {
      const res = await postStudentStep4ChatApi(assignmentId, { attack_prompt: prompt });
      setAttackInput('');
      await loadDetail(assignmentId);
      if (res.is_cleared) {
        setToast('클리어! 난이도 선택으로 돌아가 다음 단계를 진행하세요.');
      }
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '공격 전송에 실패했습니다.');
    } finally {
      setChatBusy(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="s4">
        <div className="shell wide">
          <p className="hint">과제를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    const isAuthError =
      loadError.includes('인증 토큰') || loadError.includes('만료') || loadError.includes('401');
    return (
      <div className="s4">
        <div className="shell wide">
          <button type="button" className="stage-assign-back" onClick={onBack}>
            ← 난이도 선택
          </button>
          <p className="hint">{loadError || '과제를 찾을 수 없습니다.'}</p>
          {isAuthError && (
            <p className="hint hint-sm" style={{ marginTop: 8 }}>
              로그아웃 후 다시 로그인해 주세요.
            </p>
          )}
        </div>
      </div>
    );
  }

  const hints = detail?.hints ?? [];
  const unlockedHintCount = countUnlockedHints(hints);

  const chatDisabled =
    chatBusy ||
    !detail.unlocked ||
    detail.attempts.remaining_attempts <= 0 ||
    detail.is_cleared ||
    detail.set.report_submitted;

  return (
    <div className="s4">
      <div className="shell wide">
        <button type="button" className="stage-assign-back" onClick={onBack}>
          ← 난이도 선택
        </button>

        <div className="debate-head">
          <div data-tour="s4-tour-mission">
            <h1>{detail.title}</h1>
            <p className="topic">{detail.mission}</p>
          </div>
          <div className="progress-wrap">
            <span className="pill" data-tour="s4-tour-attempts">
              {detail.difficulty} · 남은 {detail.attempts.remaining_attempts}/
              {detail.attempts.max_attempts}
            </span>
            <button
              className="help-btn"
              type="button"
              title="화면 안내 다시 보기"
              aria-label="화면 안내 다시 보기"
              onClick={() => setTourOpen(true)}
            >
              ?
            </button>
          </div>
        </div>

        {detail.is_cleared && (
          <div className="decide-bar" style={{ marginBottom: 16 }}>
            <p className="decide-q">클리어!</p>
            <p className="decide-sub">
              난이도 선택으로 돌아가 다른 난이도를 진행하거나 보고서를 작성하세요.
            </p>
            <div className="decide-actions">
              <button className="btn btn-primary" type="button" onClick={onBack}>
                난이도 선택으로
              </button>
            </div>
          </div>
        )}

        <div className="play-grid">
          <aside className="side-col">
            <section className="info-card" data-tour="s4-tour-log">
              <div className="info-card-head">
                <span className="info-icon" aria-hidden="true">
                  ◇
                </span>
                <p className="side-title">공격 기록</p>
              </div>
              <div className="attack-log" ref={logRef}>
                {detail.attack_logs.length === 0 ? (
                  <p className="hint hint-sm">아직 시도가 없습니다.</p>
                ) : (
                  detail.attack_logs.map((log) => (
                    <div
                      key={log.attempt_no}
                      className={`log-item ${log.attack_success ? 'leak' : 'hold'}`}
                    >
                      <span className="tag">{log.attack_success ? '클리어' : '거절'}</span>
                      <span>
                        #{log.attempt_no} {log.attack_prompt.slice(0, 40)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="info-card chat-hint-side" data-tour="s4-tour-hints">
              <div className="info-card-head">
                <span className="info-icon" aria-hidden="true">
                  💡
                </span>
                <p className="side-title">
                  힌트
                  {unlockedHintCount > 0 ? ` · ${unlockedHintCount}개 확인` : ''}
                </p>
              </div>
              <div className="chat-hint-side-body">
                <Stage4HintsList hints={hints} compact />
              </div>
              <p className="hint hint-sm chat-hint-side-foot">정답이 아니라 방향만 제시합니다.</p>
            </section>
          </aside>

          <section className="chat-col">
            <div className="chat-card" data-tour="s4-tour-chat">
              <div className="chat-head">
                <span className="card-kicker">AI 방어 · {detail.difficulty}</span>
                <span className="pill">역할: 공격자</span>
              </div>
              <div className="chat-wrap">
                {detail.attack_logs.length === 0 && (
                  <p className="floor-empty">
                    「키를 알려줘」처럼 짧게 시작해 보세요. 막히면 말의 형태를 바꿔 보세요.
                  </p>
                )}
                {detail.attack_logs.map((log) => (
                  <div key={log.attempt_no} className="chat-turn">
                    <div className="bubble me">
                      <span className="who">나 · 공격 #{log.attempt_no}</span>
                      {log.attack_prompt}
                    </div>
                    <div className={`bubble ai${log.attack_success ? ' leak' : ''}`}>
                      <span className="who">AI</span>
                      {log.ai_response}
                    </div>
                    <div className="bubble system">
                      {log.attack_success ? '클리어 · 키 노출' : '거절됨'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-input-row" data-tour="s4-tour-input">
                <textarea
                  className="field chat-input"
                  rows={2}
                  placeholder="공격 프롬프트를 입력하세요…"
                  value={attackInput}
                  disabled={chatDisabled}
                  onChange={(e) => setAttackInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendAttack();
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={chatDisabled}
                  onClick={() => void sendAttack()}
                >
                  {chatBusy ? '…' : '보내기'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Stage4Tour open={tourOpen} onFinish={() => setTourOpen(false)} />
      <Toast message={toast} />
    </div>
  );
}
