import { useEffect, useRef, useState } from 'react';
import {
  ATTACKS_PER_LEVEL,
  HINT_TITLES,
  STAGE4_ATTACKS,
  STAGE4_LEVELS,
  computeStage4Score,
  leakedKey,
  readStage4Assignment,
  saveStage4Result,
  stage4Advice,
  stage4Headline,
  type Stage4Level,
  type Stage4Report,
  type Stage4Result,
  type Stage4Turn,
} from '../../../mocks/stage4Guard';

export const STAGE4_DEMO_ASSIGNMENT_ID = 'sample-stage4';

type ChatBubble =
  | { kind: 'ai' | 'me'; text: string; leaked?: boolean }
  | { kind: 'system'; text: string };

function Toast({ message }: { message: string }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}

/** stage4_ui 학생 — 비밀 키 방어 (로컬 mock 데모) */
export function StudentStage4Demo({ skipIntroGuide = false }: { skipIntroGuide?: boolean }) {
  const assign = readStage4Assignment();
  const [levelIndex, setLevelIndex] = useState(0);
  const [indexInLevel, setIndexInLevel] = useState(0);
  const [unlocked, setUnlocked] = useState<Record<Stage4Level, boolean>>({
    EASY: true,
    NORMAL: false,
    HARD: false,
  });
  const [turns, setTurns] = useState<Stage4Turn[]>([]);
  const [hintsOpened, setHintsOpened] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [replyEnabled, setReplyEnabled] = useState(false);
  const [reply, setReply] = useState('');
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [levelBar, setLevelBar] = useState<{
    show: boolean;
    title: string;
    sub: string;
    showNext: boolean;
    showRetry: boolean;
  }>({ show: false, title: '', sub: '', showNext: false, showRetry: false });
  const [guideOpen, setGuideOpen] = useState(!skipIntroGuide);
  const [orderOpen, setOrderOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<Stage4Report>({ why: '', how: '', reflect: '' });
  const [result, setResult] = useState<Stage4Result | null>(null);
  const [toast, setToast] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const level = STAGE4_LEVELS[levelIndex];
  const attacks = STAGE4_ATTACKS[level];
  const currentAttack = attacks[indexInLevel];

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [bubbles]);

  const doneInLevel = attacks.filter((a) =>
    turns.some((t) => t.level === level && t.attackId === a.id && t.reply),
  ).length;

  const postAttack = (lv: Stage4Level, idx: number) => {
    const atk = STAGE4_ATTACKS[lv][idx];
    if (!atk) return;
    setBubbles((prev) => [...prev, { kind: 'ai', text: atk.text }]);
    setReplyEnabled(true);
  };

  const startLevel = (resetTurns: boolean, nextLevelIndex = levelIndex) => {
    const lv = STAGE4_LEVELS[nextLevelIndex];
    setLevelIndex(nextLevelIndex);
    if (resetTurns) {
      setTurns((prev) => prev.filter((t) => t.level !== lv));
    }
    setIndexInLevel(0);
    setAwaitingNext(false);
    setLevelBar((b) => ({ ...b, show: false }));
    setReply('');
    setStarted(true);
    setGuideOpen(false);
    const atk = STAGE4_ATTACKS[lv][0];
    setBubbles(atk ? [{ kind: 'ai', text: atk.text }] : []);
    setReplyEnabled(Boolean(atk));
  };

  useEffect(() => {
    if (!skipIntroGuide) return;
    // Strict Mode에서도 첫 공격이 남도록 동기적으로 시작
    startLevel(false, 0);
    // 공통 플로우에서 이미 안내 팝업을 봤으므로 바로 방어 시작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipIntroGuide]);

  const finishLevel = (nextTurns: Stage4Turn[], lv: Stage4Level, lvIdx: number) => {
    const group = nextTurns.filter((t) => t.level === lv && t.reply);
    const leaked = group.some((t) => t.leaked);
    const next = STAGE4_LEVELS[lvIdx + 1];
    setAwaitingNext(true);
    setReplyEnabled(false);
    if (!leaked && next) {
      setUnlocked((u) => ({ ...u, [next]: true }));
      setLevelBar({
        show: true,
        title: `${lv}를 모두 막았습니다`,
        sub: `${next} 공격 프롬프트가 기다립니다. JSON·역할극처럼 더 교묘해집니다.`,
        showNext: true,
        showRetry: false,
      });
    } else if (!leaked && !next) {
      setLevelBar({
        show: true,
        title: 'HARD까지 키를 지켰어요',
        sub: '이제 어떤 프롬프트가 위험했는지 보고서로 정리하세요.',
        showNext: false,
        showRetry: false,
      });
    } else {
      setLevelBar({
        show: true,
        title: '이 난이도에서 키가 샜어요',
        sub: '다시 막으면 다음 난이도가 열립니다. 보고서로 넘어가도 됩니다.',
        showNext: false,
        showRetry: true,
      });
    }
  };

  const submitReply = () => {
    if (!started || awaitingNext || !currentAttack) return;
    const text = reply.trim();
    if (!text) {
      setToast('답을 적어 주세요');
      return;
    }
    const leaked = leakedKey(text, assign.secret);
    const turn: Stage4Turn = {
      level,
      attackId: currentAttack.id,
      technique: currentAttack.technique,
      attack: currentAttack.text,
      reply: text,
      leaked,
    };
    const nextTurns = [...turns, turn];
    setTurns(nextTurns);
    setBubbles((prev) => [
      ...prev,
      { kind: 'me', text, leaked },
      {
        kind: 'system',
        text: leaked
          ? '키가 답에 들어갔습니다. 유출로 기록됩니다.'
          : '키를 지키며 답했습니다.',
      },
    ]);
    setReply('');
    setReplyEnabled(false);

    if (indexInLevel < ATTACKS_PER_LEVEL - 1) {
      const nextIdx = indexInLevel + 1;
      setIndexInLevel(nextIdx);
      window.setTimeout(() => postAttack(level, nextIdx), 450);
    } else {
      finishLevel(nextTurns, level, levelIndex);
    }
  };

  const submitReport = () => {
    if (!report.why.trim() || !report.how.trim()) {
      setToast('위험 이유와 막는 방법을 적어 주세요');
      return;
    }
    const stats = computeStage4Score(turns, hintsOpened.length, report);
    const payload: Stage4Result = {
      title: assign.title,
      secret: assign.secret,
      turns,
      hintsUsed: hintsOpened.length,
      report,
      stats,
      at: Date.now(),
    };
    saveStage4Result(payload);
    setResult(payload);
  };

  if (result) {
    return <StudentStage4Done result={result} onRetry={() => window.location.reload()} />;
  }

  const nextLevelName = STAGE4_LEVELS[levelIndex + 1];

  return (
    <div className="s4">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · 보안 강화</span>
          </div>
          <div className="topbar-actions">
            <button
              className="help-btn"
              type="button"
              title="진행 순서 보기"
              aria-label="진행 순서 보기"
              onClick={() => setOrderOpen(true)}
            >
              ?
            </button>
          </div>
        </header>

        <nav className="steps" aria-label="진행 단계">
          <div className="step">과제 선택</div>
          <div className="step" aria-current={!showReport ? 'step' : undefined}>
            방어
          </div>
          <div className="step" aria-current={showReport ? 'step' : undefined}>
            결과 확인
          </div>
        </nav>

        {!showReport ? (
          <>
            <div className="debate-head">
              <div>
                <h1>{assign.title}</h1>
                <p className="topic">{assign.mission}</p>
              </div>
              <div className="progress-wrap">
                <span className="pill">
                  {level} · {Math.min(doneInLevel, ATTACKS_PER_LEVEL)} / {ATTACKS_PER_LEVEL}
                </span>
                <div className="progress-bar">
                  <span
                    style={{
                      width: `${(Math.min(doneInLevel, ATTACKS_PER_LEVEL) / ATTACKS_PER_LEVEL) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="play-grid">
              <aside className="side-col">
                <section className="info-card">
                  <div className="info-card-head">
                    <span className="info-icon" aria-hidden="true">
                      ◇
                    </span>
                    <p className="side-title">난이도</p>
                  </div>
                  <div className="diff-tabs">
                    {STAGE4_LEVELS.map((lv, i) => {
                      const isUnlocked = unlocked[lv];
                      const current = i === levelIndex;
                      const label = isUnlocked ? (current ? '진행 중' : '해금') : '잠김';
                      return (
                        <button
                          key={lv}
                          type="button"
                          className={`diff-tab${isUnlocked ? '' : ' locked'}`}
                          aria-current={current ? 'true' : undefined}
                          disabled={!isUnlocked}
                          onClick={() => {
                            if (!isUnlocked || i === levelIndex) return;
                            startLevel(false, i);
                          }}
                        >
                          <span>{lv}</span>
                          <span className="state">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="hint hint-sm" style={{ marginTop: 10 }}>
                    {nextLevelName
                      ? `${level}를 모두 막으면 ${nextLevelName}이 열립니다.`
                      : 'HARD까지 막으면 보고서를 작성하세요.'}
                  </p>
                </section>

                <section className="info-card key-card">
                  <div className="info-card-head">
                    <span className="info-icon" aria-hidden="true">
                      ◆
                    </span>
                    <p className="side-title">내가 지킬 키</p>
                  </div>
                  <code className="secret-key">{assign.secret}</code>
                  <p className="hint hint-sm" style={{ marginTop: 8 }}>
                    이 문자열이 답에 들어가면 유출입니다. 거꾸로 쓰거나 JSON에 넣어도 같습니다.
                  </p>
                </section>

                <section className="info-card">
                  <div className="info-card-head">
                    <span className="info-icon" aria-hidden="true">
                      ◇
                    </span>
                    <p className="side-title">방어 로그</p>
                  </div>
                  <div className="attack-log">
                    {turns.filter((t) => t.reply).length === 0 ? (
                      <p className="hint hint-sm">아직 기록이 없습니다.</p>
                    ) : (
                      turns
                        .filter((t) => t.reply)
                        .slice(-8)
                        .map((t, i) => (
                          <div key={`${t.attackId}-${i}`} className={`log-item ${t.leaked ? 'leak' : 'hold'}`}>
                            <span className="tag">{t.leaked ? 'LEAK' : 'HOLD'}</span>
                            <span>
                              {t.level} · {t.technique}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </section>

                <button className="btn btn-ghost" type="button" onClick={() => setHintOpen(true)}>
                  힌트 보기
                </button>
              </aside>

              <section className="chat-col">
                <div className="chat-card">
                  <div className="chat-head">
                    <span className="card-kicker">AI 공격자</span>
                    <span className="pill">
                      {started && currentAttack
                        ? `${level} · ${currentAttack.technique}`
                        : '프롬프트를 남기는 중'}
                    </span>
                  </div>
                  <div className="chat-wrap" ref={chatRef}>
                    {bubbles.length === 0 && (
                      <p className="floor-empty">
                        {started ? '공격을 불러오는 중…' : '방어를 시작해 주세요.'}
                      </p>
                    )}
                    {bubbles.map((b, i) =>
                      b.kind === 'system' ? (
                        <div key={i} className="bubble system">
                          {b.text}
                        </div>
                      ) : (
                        <div
                          key={i}
                          className={`bubble ${b.kind}${b.kind === 'me' && b.leaked ? ' leak' : ''}`}
                        >
                          <span className="who">{b.kind === 'ai' ? 'AI 공격자' : '나 · 문지기'}</span>
                          {b.text.split('\n').map((line, li) => (
                            <span key={li}>
                              {li > 0 && <br />}
                              {line}
                            </span>
                          ))}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="chat-input-row">
                    <textarea
                      className="field chat-input"
                      rows={2}
                      placeholder="문지기로서 답하세요. 키는 넣지 마세요."
                      value={reply}
                      disabled={!replyEnabled}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitReply();
                        }
                      }}
                    />
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={!replyEnabled}
                      onClick={submitReply}
                    >
                      답하기
                    </button>
                  </div>
                </div>

                {levelBar.show && (
                  <div className="decide-bar">
                    <p className="decide-q">{levelBar.title}</p>
                    <p className="decide-sub">{levelBar.sub}</p>
                    <div className="decide-actions">
                      {levelBar.showNext && (
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => startLevel(false, levelIndex + 1)}
                        >
                          다음 난이도
                        </button>
                      )}
                      {levelBar.showRetry && (
                        <button className="btn btn-ghost" type="button" onClick={() => startLevel(true)}>
                          이 난이도 다시
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => setShowReport(true)}
                      >
                        보고서 작성
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <section className="report-panel">
            <h2>보안 분석 보고서</h2>
            <p className="hint" style={{ marginBottom: 18 }}>
              어떤 프롬프트가 위험했는지, 키를 어떻게 지킬 수 있는지 적어 제출하세요.
            </p>
            <div className="stack">
              <div className="field-group">
                <label className="label" htmlFor="whyInput">
                  이런 질문이 왜 위험한가요?
                </label>
                <textarea
                  id="whyInput"
                  className="field"
                  rows={3}
                  value={report.why}
                  onChange={(e) => setReport((r) => ({ ...r, why: e.target.value }))}
                  placeholder="키가 새면 어떤 일이 생기는지, 왜 속이기 쉬운지"
                />
              </div>
              <div className="field-group">
                <label className="label" htmlFor="howInput">
                  어떻게 막을까요?
                </label>
                <textarea
                  id="howInput"
                  className="field"
                  rows={3}
                  value={report.how}
                  onChange={(e) => setReport((r) => ({ ...r, how: e.target.value }))}
                  placeholder="문지기가 지켜야 할 규칙을 제안해 보세요"
                />
              </div>
              <div className="field-group">
                <label className="label" htmlFor="reflectInput">
                  오늘 방어에서 배운 점
                </label>
                <textarea
                  id="reflectInput"
                  className="field"
                  rows={2}
                  value={report.reflect}
                  onChange={(e) => setReport((r) => ({ ...r, reflect: e.target.value }))}
                  placeholder="거의 속았던 프롬프트가 있다면 적어 보세요"
                />
              </div>
              <div className="actions">
                <button className="btn btn-ghost" type="button" onClick={() => setShowReport(false)}>
                  방어로 돌아가기
                </button>
                <button className="btn btn-primary" type="button" onClick={submitReport}>
                  보고서 제출하기
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
              <h2>이 활동은 이렇게 진행돼요</h2>
            </header>
            <div className="modal-body">
              <p className="hint" style={{ marginBottom: 18 }}>
                여러분은 키를 빼내는 쪽이 아닙니다. <b>숨겨진 키를 지키는 문지기</b>입니다.
              </p>
              <ol className="guide-list">
                <li>
                  <span className="guide-num">1</span>
                  <div>
                    <strong>AI가 먼저 프롬프트를 남깁니다</strong>
                    <p>직접 묻거나, 역할을 바꾸거나, 형식을 바꿔 키를 유도합니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">2</span>
                  <div>
                    <strong>문지기로서 답합니다</strong>
                    <p>키·키의 조각·거꾸로 쓴 키를 답에 넣으면 유출로 판정됩니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">3</span>
                  <div>
                    <strong>EASY를 막으면 다음 난이도가 열립니다</strong>
                    <p>NORMAL, HARD 순으로 공격이 교묘해집니다. 막힌 뒤에는 보고서를 씁니다.</p>
                  </div>
                </li>
              </ol>
              <div className="callout">
                <b>채점</b>
                <br />
                키를 지킨 비율과 보고서가 중심입니다. 힌트 카드는 쓸 수 있지만 감점됩니다.
              </div>
            </div>
            <div className="modal-foot">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  if (!started) {
                    setStarted(true);
                    startLevel(false, 0);
                  }
                }}
              >
                방어 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {orderOpen && (
        <div
          className="modal open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOrderOpen(false);
          }}
        >
          <div className="modal-card">
            <header>
              <h2>진행 순서</h2>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setOrderOpen(false)}>
                닫기
              </button>
            </header>
            <div className="modal-body">
              <div className="order-flow">
                <span className="order-chip easy">EASY</span>
                <span className="order-arrow">→</span>
                <span className="order-chip normal">NORMAL</span>
                <span className="order-arrow">→</span>
                <span className="order-chip hard">HARD</span>
                <span className="order-arrow">→</span>
                <span className="order-chip check">보고서</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" type="button" onClick={() => setOrderOpen(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {hintOpen && (
        <div
          className="modal open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHintOpen(false);
          }}
        >
          <div className="modal-card">
            <header>
              <h2>방어 힌트</h2>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setHintOpen(false)}>
                닫기
              </button>
            </header>
            <div className="modal-body">
              <p className="hint" style={{ marginBottom: 14 }}>
                카드를 열면 감점됩니다. 필요한 것만 보세요.
              </p>
              <div className="hint-list">
                {assign.hints.map((h, i) => {
                  const used = hintsOpened.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`hint-card${used ? ' used' : ''}`}
                      onClick={() => {
                        if (!used) {
                          setHintsOpened((prev) => [...prev, i]);
                          setToast('힌트를 열었습니다 · 감점');
                        }
                      }}
                    >
                      <strong>
                        {HINT_TITLES[i] || `힌트 ${i + 1}`}
                        {used ? ' · 열람함' : ''}
                      </strong>
                      <p>
                        {used
                          ? h
                          : '카드를 누르면 내용이 열립니다. 열면 감점됩니다.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

function StudentStage4Done({
  result,
  onRetry,
}: {
  result: Stage4Result;
  onRetry: () => void;
}) {
  const stats = result.stats;
  return (
    <div className="s4">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · 보안 강화</span>
          </div>
        </header>
        <nav className="steps" aria-label="진행 단계">
          <div className="step">과제 선택</div>
          <div className="step">방어</div>
          <div className="step" aria-current="step">
            결과 확인
          </div>
        </nav>

        <section className="score-hero">
          <div className="score-ring" style={{ ['--p' as string]: String(stats.score) }}>
            <div className="inner">
              <strong>{stats.score}</strong>
              <span>보안 점수</span>
            </div>
          </div>
          <div className="score-copy">
            <h1>{stage4Headline(stats)}</h1>
            <p>{stage4Advice(stats)}</p>
            <p className="hint hint-sm" style={{ marginTop: 10 }}>
              {result.title}
            </p>
          </div>
        </section>

        <div className="tally">
          <div className="tally-item good">
            <strong>{stats.held}</strong>
            <span>키를 지킨 답</span>
          </div>
          <div className="tally-item bad">
            <strong>{stats.leaked}</strong>
            <span>키가 샌 답</span>
          </div>
          <div className="tally-item">
            <strong>{stats.hintsUsed}</strong>
            <span>힌트 사용</span>
          </div>
          <div className="tally-item">
            <strong>
              {stats.cleared} / 3
            </strong>
            <span>해금한 난이도</span>
          </div>
        </div>

        <section className="info-card" style={{ marginBottom: 22 }}>
          <div className="info-card-head">
            <span className="info-icon" aria-hidden="true">
              ◇
            </span>
            <p className="side-title">채점 기준</p>
          </div>
          <p className="mission-text">
            이 점수는 해킹 성공이 아닙니다. AI가 남긴 프롬프트에 키가 들어가지 않았는지, 위험 이유와
            방어 규칙을 구체적으로 적었는지를 봅니다.
          </p>
        </section>

        <div className="debate-head">
          <div>
            <h1>프롬프트별 판정</h1>
            <p className="topic">AI 공격과 내 답을 나란히 확인해 보세요.</p>
          </div>
        </div>

        <div className="review">
          {result.turns.length === 0 ? (
            <p className="hint">기록된 답이 없습니다.</p>
          ) : (
            result.turns.map((t, i) => (
              <div key={`${t.attackId}-${i}`} className={`review-row${t.leaked ? ' is-wrong' : ''}`}>
                <span className={`side ${t.level.toLowerCase()}`}>{t.level}</span>
                <div className="claim-text">
                  {t.attack}
                  <em>내 답 · {t.reply}</em>
                </div>
                <span className={`mark ${t.leaked ? 'miss' : 'ok'}`}>{t.leaked ? '유출' : '지킴'}</span>
              </div>
            ))
          )}
        </div>

        <section className="info-card" style={{ marginTop: 22 }}>
          <div className="info-card-head">
            <span className="info-icon" aria-hidden="true">
              ◇
            </span>
            <p className="side-title">내 보고서</p>
          </div>
          <div className="report-preview">
            <p>
              <strong>왜 위험한가</strong>
              {result.report.why || '—'}
            </p>
            <p>
              <strong>어떻게 막을까</strong>
              {result.report.how || '—'}
            </p>
            <p>
              <strong>배운 점</strong>
              {result.report.reflect || '—'}
            </p>
          </div>
        </section>

        <div className="actions" style={{ marginTop: 24 }}>
          <button className="btn btn-primary" type="button" onClick={onRetry}>
            다시 방어해보기
          </button>
        </div>
      </div>
    </div>
  );
}
