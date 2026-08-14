import { useEffect, useRef, useState } from 'react';
import {
  STAGE3_SAMPLE,
  VERDICT_LABEL,
  checkStage3Langflow,
  cloneSampleDebate,
  gradeDebate,
  loadStage3Debate,
  readStage3Assignment,
  readStage3Result,
  saveStage3Result,
  type Stage3Debate,
  type Stage3GradeResult,
  type Stage3Turn,
  type Stage3Verdict,
} from '../../../mocks/stage3Debate';

const AVATAR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20.4c0-3.9 3.4-6.3 7.5-6.3s7.5 2.4 7.5 6.3" />
  </svg>
);

type FloorItem =
  | { kind: 'turn'; turn: Stage3Turn; checked: boolean | null }
  | { kind: 'verdict'; claim: string; verdict: Stage3Verdict; reason: string };

type Phase = 'guide' | 'decide' | 'next' | 'done';

function Toast({ message }: { message: string }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}

function Grounds({ turn }: { turn: Stage3Turn }) {
  const items = (turn.grounds || []).filter(Boolean);
  if (items.length > 1) {
    return (
      <span className="claim">
        <b>핵심 근거</b>
        <ol className="claim-list">
          {items.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ol>
      </span>
    );
  }
  return (
    <span className="claim">
      <b>핵심 근거</b>
      {turn.claim || items[0] || ''}
    </span>
  );
}

/** stage3_ui 학생 토론장 */
export function StudentStage3Activity({ skipIntroGuide = false }: { skipIntroGuide?: boolean }) {
  const assignment = readStage3Assignment();
  const [debate, setDebate] = useState<Stage3Debate>(() => cloneSampleDebate(assignment));
  const [floor, setFloor] = useState<FloorItem[]>([]);
  const [idx, setIdx] = useState(-1);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<Phase>('guide');
  const [guideOpen, setGuideOpen] = useState(!skipIntroGuide);
  const [orderOpen, setOrderOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [langLabel, setLangLabel] = useState('연결 확인 중');
  const [langOk, setLangOk] = useState(false);
  const [toast, setToast] = useState('');
  const [result, setResult] = useState<Stage3GradeResult | null>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    void checkStage3Langflow().then((ok) => {
      setLangOk(ok);
      setLangLabel(ok ? 'Langflow 연결됨' : '서버 대기 중');
    });
  }, []);

  useEffect(() => {
    if (floorRef.current) floorRef.current.scrollTop = floorRef.current.scrollHeight;
  }, [floor]);

  const currentTurn = idx >= 0 ? debate.turns[idx] : null;
  const doneCount = Object.keys(decisions).length;
  const speakingSide = phase === 'decide' && currentTurn ? currentTurn.side : null;

  const pushTurn = (turn: Stage3Turn) => {
    setFloor((prev) => {
      if (prev.some((p) => p.kind === 'turn' && p.turn.id === turn.id)) return prev;
      return [...prev, { kind: 'turn', turn, checked: null }];
    });
  };

  const begin = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarting(true);
    let nextDebate = cloneSampleDebate(assignment);
    try {
      const live = await loadStage3Debate(assignment);
      if (assignment?.proPersona) live.pro.role = assignment.proPersona;
      if (assignment?.conPersona) live.con.role = assignment.conPersona;
      nextDebate = live;
      setLangOk(true);
      setLangLabel('Langflow 연결됨');
      setToast(`토론 준비 완료 (${live.elapsed ?? '?'}초)`);
    } catch {
      setLangOk(false);
      setLangLabel('샘플 토론');
      setToast('Langflow에 연결하지 못해 샘플 토론으로 진행합니다.');
    }
    setDebate(nextDebate);
    setGuideOpen(false);
    setFloor([]);
    setDecisions({});
    setIdx(0);
    pushTurn(nextDebate.turns[0]);
    setPhase('decide');
    setStarting(false);
  };

  useEffect(() => {
    if (!skipIntroGuide) return;
    void begin();
    // 공통 플로우에서 이미 안내 팝업을 봤으므로 바로 토론 시작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipIntroGuide]);

  const decide = (checked: boolean) => {
    if (!currentTurn || phase !== 'decide') return;
    const turn = currentTurn;
    const nextDecisions = { ...decisions, [turn.id]: checked };
    setDecisions(nextDecisions);
    setFloor((prev) => {
      const next = prev.map((item) =>
        item.kind === 'turn' && item.turn.id === turn.id ? { ...item, checked } : item,
      );
      if (checked) {
        const claims =
          turn.claims?.length > 0
            ? turn.claims
            : [{ claim: turn.claim, verdict: turn.verdict, reason: turn.why }];
        for (const c of claims) {
          next.push({ kind: 'verdict', claim: c.claim, verdict: c.verdict, reason: c.reason });
        }
      }
      return next;
    });
    if (!checked) setToast('검증 없이 넘어갔습니다.');
    setPhase('next');
  };

  const goResult = (finalDecisions: Record<string, boolean>) => {
    const graded = gradeDebate(debate.turns, finalDecisions, debate.topic, debate.source);
    saveStage3Result(graded);
    setResult(graded);
    setPhase('done');
  };

  const advance = () => {
    if (idx >= debate.turns.length - 1) {
      goResult(decisions);
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    pushTurn(debate.turns[nextIdx]);
    setPhase('decide');
  };

  const finish = () => {
    goResult(decisions);
  };

  if (phase === 'done' && result) {
    return <StudentStage3Done result={result} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="s3">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · 3단계</span>
          </div>
          <div className="topbar-actions">
            <span className={`lang-status${langOk ? ' ok' : ' off'}`}>{langLabel}</span>
            <button
              className="help-btn"
              type="button"
              title="토론 순서 보기"
              aria-label="토론 순서 보기"
              onClick={() => setOrderOpen(true)}
            >
              ?
            </button>
          </div>
        </header>

        <nav className="steps" aria-label="진행 단계">
          <div className="step">과제 받기</div>
          <div className="step" aria-current="step">
            토론 평가
          </div>
          <div className="step">결과 확인</div>
        </nav>

        <div className="debate-head">
          <div>
            <h1>AI 토론장</h1>
            <p className="topic">{debate.topic}</p>
          </div>
          <div className="progress-wrap">
            <span className="pill">
              발언 {Math.min(Math.max(idx + 1, 0), debate.turns.length)} / {debate.turns.length}
            </span>
            <div className="progress-bar">
              <span style={{ width: debate.turns.length ? `${(doneCount / debate.turns.length) * 100}%` : '0%' }} />
            </div>
          </div>
        </div>

        <section className="stage">
          <div className={`seat pro${speakingSide === 'pro' ? ' speaking' : speakingSide ? ' waiting' : ''}`}>
            <div className="avatar">{AVATAR}</div>
            <span className="speaking-tag">발언 중</span>
            <p className="who">찬성 측 AI</p>
            <p className="role">{debate.pro.role}</p>
          </div>

          <div className="floor" id="floor" ref={floorRef}>
            {floor.length === 0 && <p className="floor-empty">안내를 읽고 토론을 시작하세요.</p>}
            {floor.map((item, i) =>
              item.kind === 'turn' ? (
                <div
                  key={item.turn.id}
                  className={`say ${item.turn.side}${item.checked === null ? ' pending' : ''}`}
                >
                  <div className="say-meta">
                    <span className="name">{debate[item.turn.side].name}</span>
                    <span>{item.turn.round}</span>
                  </div>
                  <div className="bubble">
                    {item.turn.text}
                    <Grounds turn={item.turn} />
                  </div>
                  {item.checked !== null && (
                    <span className={`decision${item.checked ? ' checked' : ''}`}>
                      {item.checked ? '팩트체커에게 검증 요청함' : '검증 없이 넘어감'}
                    </span>
                  )}
                </div>
              ) : (
                <div key={`v-${i}`} className="say check">
                  <div className="verdict">
                    <div className="verdict-head">
                      <span className="name">팩트체커 AI</span>
                      <span className={`verdict-tag ${item.verdict}`}>
                        {VERDICT_LABEL[item.verdict] || item.verdict}
                      </span>
                    </div>
                    <p>“{item.claim}”</p>
                    <p className="why">{item.reason}</p>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className={`seat con${speakingSide === 'con' ? ' speaking' : speakingSide ? ' waiting' : ''}`}>
            <div className="avatar">{AVATAR}</div>
            <span className="speaking-tag">발언 중</span>
            <p className="who">반대 측 AI</p>
            <p className="role">{debate.con.role}</p>
          </div>
        </section>

        <div className="decide-bar">
          {phase === 'guide' && (
            <>
              <p className="decide-q">아직 토론이 시작되지 않았습니다</p>
              <p className="decide-sub">안내 창의 &lsquo;토론 시작하기&rsquo;를 누르면 첫 발언이 나옵니다.</p>
            </>
          )}
          {phase === 'decide' && (
            <>
              <p className="decide-q">이 근거, 팩트체커에게 맡길까요?</p>
              <p className="decide-sub">평가자는 발언마다 검증 여부를 직접 정합니다. 검증도 판단의 일부입니다.</p>
              <div className="decide-actions">
                <button className="btn btn-check" type="button" onClick={() => decide(true)}>
                  팩트체커에게 검증 요청
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => decide(false)}>
                  검증 없이 넘어가기
                </button>
              </div>
              <div className="usage">
                <span>
                  팩트체커 사용 {Object.values(decisions).filter(Boolean).length}회 · 검증 없이 넘어간 발언{' '}
                  {Object.values(decisions).filter((v) => !v).length}개
                </span>
              </div>
            </>
          )}
          {phase === 'next' && (
            <>
              <p className="decide-q">
                {idx >= debate.turns.length - 1 ? '토론이 끝났습니다' : '다음 발언을 들어 보세요'}
              </p>
              <p className="decide-sub">
                {idx >= debate.turns.length - 1
                  ? '팩트체커를 얼마나 적절히 썼는지 확인할 차례입니다.'
                  : '상대 측이 이어서 발언합니다.'}
              </p>
              <div className="decide-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={idx >= debate.turns.length - 1 ? finish : advance}
                >
                  {idx >= debate.turns.length - 1 ? '평가 결과 보기' : '다음 발언 듣기'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {guideOpen && (
        <div className="modal open" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h2>이 활동은 이렇게 진행돼요</h2>
            </header>
            <div className="modal-body">
              <p className="hint" style={{ marginBottom: 18 }}>
                여러분은 토론에 참가하는 <b>평가자</b>입니다. 찬성·반대를 고르는 활동이 아닙니다.
              </p>
              <ol className="guide-list">
                <li>
                  <span className="guide-num">1</span>
                  <div>
                    <strong>두 AI가 번갈아 발언합니다</strong>
                    <p>찬성 측과 반대 측이 한 번씩 주고받으며 근거를 제시합니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">2</span>
                  <div>
                    <strong>발언마다 검증할지 정합니다</strong>
                    <p>
                      근거가 과장됐거나 사실과 달라 보이면 <b>팩트체커에게 검증을 요청</b>하고, 믿을
                      만하면 그냥 넘어갑니다.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">3</span>
                  <div>
                    <strong>팩트체커 사용 능력으로 점수가 매겨집니다</strong>
                    <p>
                      누가 토론에서 이겼는지는 채점하지 않습니다. <b>의심할 순간에 AI를 썼는지</b>를
                      봅니다.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="callout">
                <b>감점되는 경우</b>
                <br />
                과장·허위 근거인데 검증하지 않고 넘어갔을 때, 반대로 근거가 탄탄한 발언까지 검증했을
                때. 검증에도 비용이 든다는 점을 기억하세요.
              </div>
              <p className="hint hint-sm" style={{ marginTop: 14 }}>
                {starting
                  ? '찬성·반대·팩트체커가 차례로 말하고 있습니다. 약 15초 걸립니다.'
                  : '시작을 누르면 찬성·반대·팩트체커 AI가 토론을 준비합니다. 약 15초 걸립니다.'}
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" type="button" disabled={starting} onClick={() => void begin()}>
                {starting ? 'AI가 토론을 준비하는 중…' : '토론 시작하기'}
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
              <h2>토론 순서</h2>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setOrderOpen(false)}>
                닫기
              </button>
            </header>
            <div className="modal-body">
              <div className="order-flow">
                <span className="order-chip pro">찬성 주장</span>
                <span className="order-arrow">→</span>
                <span className="order-chip con">반대 반박</span>
                <span className="order-arrow">→</span>
                <span className="order-chip pro">찬성 재반박</span>
                <span className="order-arrow">→</span>
                <span className="order-chip check">팩트체커</span>
              </div>
              <ol className="guide-list">
                <li>
                  <span className="guide-num">1</span>
                  <div>
                    <strong>세 번의 발언이 오갑니다</strong>
                    <p>찬성이 먼저 말하고, 반대가 반박한 뒤, 찬성이 다시 답합니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">2</span>
                  <div>
                    <strong>발언 하나가 끝날 때마다 멈춥니다</strong>
                    <p>다음 발언으로 넘어가기 전에 검증 여부를 반드시 정해야 합니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">3</span>
                  <div>
                    <strong>팩트체커는 언제든 부를 수 있습니다</strong>
                    <p>그 발언의 핵심 근거만 검증해 판정과 이유를 알려줍니다.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" type="button" onClick={() => setOrderOpen(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

function StudentStage3Done({
  result,
  onRetry,
}: {
  result: Stage3GradeResult;
  onRetry: () => void;
}) {
  const MARK = {
    caught: { cls: 'ok', label: '정확히 잡아냄' },
    passed: { cls: 'ok', label: '적절히 넘어감' },
    missed: { cls: 'miss', label: '놓침' },
    wasted: { cls: 'waste', label: '불필요한 검증' },
  } as const;

  return (
    <div className="s3">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · 3단계</span>
          </div>
        </header>
        <nav className="steps" aria-label="진행 단계">
          <div className="step">과제 받기</div>
          <div className="step">토론 평가</div>
          <div className="step" aria-current="step">
            결과 확인
          </div>
        </nav>

        <section className="score-hero">
          <div className="score-ring" style={{ ['--p' as string]: String(result.score) }}>
            <div className="inner">
              <strong>{result.score}</strong>
              <span>AI 활용 점수</span>
            </div>
          </div>
          <div className="score-copy">
            <h1>{result.headline}</h1>
            <p>{result.advice}</p>
            <p className="hint hint-sm" style={{ marginTop: 10 }}>
              {result.topic}
            </p>
          </div>
        </section>

        <div className="tally">
          <div className="tally-item good">
            <strong>{result.caught}</strong>
            <span>허술한 근거를 잡아냄</span>
          </div>
          <div className="tally-item good">
            <strong>{result.passed}</strong>
            <span>탄탄한 근거를 넘어감</span>
          </div>
          <div className="tally-item bad">
            <strong>{result.missed}</strong>
            <span>놓친 근거</span>
          </div>
          <div className="tally-item bad">
            <strong>{result.wasted}</strong>
            <span>불필요한 검증</span>
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
            이 점수는 토론의 승패를 평가하지 않습니다. 검증이 필요한 발언에 팩트체커를 썼는지, 믿을
            만한 발언을 불필요하게 검증하지는 않았는지를 봅니다.
          </p>
        </section>

        <div className="debate-head">
          <div>
            <h1>발언별 판정</h1>
            <p className="topic">내 판단과 팩트체커의 판정을 나란히 확인해 보세요.</p>
          </div>
        </div>

        <div className="review">
          {result.rows.map((row) => {
            const mark = MARK[row.outcome];
            const wrong = row.outcome === 'missed' || row.outcome === 'wasted';
            return (
              <div key={row.id} className={`review-row${wrong ? ' is-wrong' : ''}`}>
                <span className={`side ${row.side}`}>{row.side === 'pro' ? '찬성' : '반대'}</span>
                <div className="claim-text">
                  {row.claim}
                  <em>
                    팩트체커 판정 · {VERDICT_LABEL[row.verdict] || row.verdict} — {row.why}
                  </em>
                </div>
                <span className={`mark ${mark.cls}`}>{mark.label}</span>
              </div>
            );
          })}
        </div>

        <div className="actions" style={{ marginTop: 24 }}>
          <button className="btn btn-primary" type="button" onClick={onRetry}>
            다시 평가해보기
          </button>
        </div>
      </div>
    </div>
  );
}

/** 저장된 결과가 있으면 결과 화면만 (선택적) */
export function StudentStage3DoneFromStorage() {
  const result = readStage3Result();
  if (!result) {
    return (
      <div className="s3">
        <div className="shell">
          <p className="hint">먼저 토론을 진행해 주세요.</p>
        </div>
      </div>
    );
  }
  return <StudentStage3Done result={result} onRetry={() => window.location.reload()} />;
}

export { STAGE3_SAMPLE };
