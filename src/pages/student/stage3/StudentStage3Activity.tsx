import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  ApiError,
  getStudentStep3Api,
  postStudentStep3DebateApi,
  postStudentStep3FactcheckApi,
  postStudentStep3SourcesApi,
  postStudentStep3SubmitApi,
} from '../../../api';
import type {
  Stage3AssignmentDetailResponse,
  Stage3DebatePublicPayload,
  Stage3GradeRow as Stage3ApiGradeRow,
  Stage3SourceItem,
  Stage3SubmitResponse,
  Stage3TurnPublic,
} from '../../../api/types';

type Stage3Verdict = 'supported' | 'exaggerated' | 'unsupported' | 'false';

interface Stage3Claim {
  claim: string;
  verdict: Stage3Verdict;
  reason: string;
}

interface Stage3Turn {
  id: string;
  side: 'pro' | 'con';
  round: string;
  text: string;
  claim: string;
  grounds: string[];
  verdict: Stage3Verdict;
  why: string;
  claims: Stage3Claim[];
}

interface Stage3Debate {
  topic: string;
  source: string;
  pro: { name: string; role: string };
  con: { name: string; role: string };
  turns: Stage3Turn[];
  elapsed?: string | number;
}

type Stage3Outcome = 'caught' | 'passed' | 'missed' | 'wasted';

interface Stage3GradeRow extends Stage3Turn {
  checked: boolean;
  suspicious: boolean;
  outcome: Stage3Outcome;
}

interface Stage3GradeResult {
  topic: string;
  source: string;
  rows: Stage3GradeRow[];
  caught: number;
  passed: number;
  missed: number;
  wasted: number;
  score: number;
  usageScore: number;
  reasoningScore: number;
  headline: string;
  advice: string;
  judgment?: string;
  corrections?: Record<string, { highlight: string; why: string; ground: string }>;
  correctionGrades?: Record<string, { whyRating: number; groundRating: number; turnScore: number; feedback: string }>;
}

const VERDICT_LABEL: Record<Stage3Verdict, string> = {
  supported: '근거 확인됨',
  exaggerated: '과장됨',
  unsupported: '근거 부족',
  false: '사실과 다름',
};

const OUTCOMES: Stage3Outcome[] = ['caught', 'passed', 'missed', 'wasted'];

function dedupeSourceItems(items: Stage3SourceItem[]): Stage3SourceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const core = (item.title || '').replace(/\s*—\s*.+$/, '').replace(/\s+/g, '').toLowerCase();
    const key = core || item.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toUiVerdict(value?: string | null): Stage3Verdict {
  if (value === 'supported' || value === 'exaggerated' || value === 'unsupported' || value === 'false') {
    return value;
  }
  return 'unsupported';
}

function createEmptyDebate(seed?: {
  topic?: string | null;
  proRole?: string | null;
  conRole?: string | null;
}): Stage3Debate {
  return {
    topic: seed?.topic || '',
    source: 'api',
    pro: { name: '찬성 측 AI', role: seed?.proRole || '' },
    con: { name: '반대 측 AI', role: seed?.conRole || '' },
    turns: [],
  };
}

function turnFromPublic(turn: Stage3TurnPublic): Stage3Turn {
  const claims = (turn.claims ?? []).map((c) => ({
    claim: c.claim,
    verdict: toUiVerdict(c.verdict),
    reason: c.reason || '',
  }));
  return {
    id: turn.id,
    side: turn.side === 'con' ? 'con' : 'pro',
    round: turn.round,
    text: turn.text,
    claim: turn.claim,
    grounds: turn.grounds ?? [],
    verdict: toUiVerdict(turn.verdict),
    why: turn.why || '',
    claims,
  };
}

function debateFromPublic(payload: Stage3DebatePublicPayload): Stage3Debate {
  return {
    topic: payload.topic,
    source: payload.source || 'api',
    elapsed: payload.elapsed ?? undefined,
    pro: payload.pro,
    con: payload.con,
    turns: (payload.turns ?? []).map(turnFromPublic),
  };
}

function toOutcome(value: string): Stage3Outcome {
  return OUTCOMES.includes(value as Stage3Outcome) ? (value as Stage3Outcome) : 'passed';
}

function rowFromApi(row: Stage3ApiGradeRow, debate: Stage3Debate): Stage3GradeRow {
  const turn = debate.turns.find((t) => t.id === row.id);
  return {
    id: row.id,
    side: row.side === 'con' ? 'con' : 'pro',
    round: row.round || turn?.round || '',
    text: row.text || turn?.text || '',
    claim: row.claim || turn?.claim || '',
    grounds: turn?.grounds ?? [],
    verdict: toUiVerdict(row.verdict),
    why: row.why || '',
    claims: turn?.claims ?? [],
    checked: row.checked,
    suspicious: row.suspicious,
    outcome: toOutcome(row.outcome),
  };
}

function resultFromSubmit(
  res: Stage3SubmitResponse,
  debate: Stage3Debate,
  extras?: {
    judgment?: string;
    corrections?: Record<string, { highlight: string; why: string; ground: string }>;
  },
): Stage3GradeResult {
  const correctionGrades = Object.fromEntries(
    (res.correction_rows ?? []).map((row) => [
      row.turn_id,
      {
        whyRating: row.why_rating,
        groundRating: row.ground_rating,
        turnScore: row.turn_score,
        feedback: row.feedback,
      },
    ]),
  );
  return {
    topic: debate.topic,
    source: debate.source,
    rows: (res.rows ?? []).map((row) => rowFromApi(row, debate)),
    caught: res.caught,
    passed: res.passed,
    missed: res.missed,
    wasted: res.wasted,
    score: res.highest_score ?? res.current_score ?? 0,
    usageScore: res.usage_score ?? res.current_score ?? 0,
    reasoningScore: res.reasoning_score ?? res.current_score ?? 0,
    headline: res.headline,
    advice: res.advice,
    judgment: extras?.judgment,
    corrections: extras?.corrections,
    correctionGrades,
  };
}

function resultFromCompleted(detail: Stage3AssignmentDetailResponse): Stage3GradeResult {
  const debate = detail.debate
    ? debateFromPublic(detail.debate)
    : createEmptyDebate({
        topic: detail.topic,
        proRole: detail.pro_persona,
        conRole: detail.con_persona,
      });
  if (detail.grade_result) {
    return resultFromSubmit(detail.grade_result, debate);
  }
  return {
    topic: detail.topic || debate.topic,
    source: debate.source,
    rows: [],
    caught: 0,
    passed: 0,
    missed: 0,
    wasted: 0,
    score: detail.highest_score ?? 0,
    usageScore: detail.grade_result?.usage_score ?? detail.highest_score ?? 0,
    reasoningScore: detail.grade_result?.reasoning_score ?? detail.highest_score ?? 0,
    headline: '과제를 제출했습니다',
    advice: '이미 제출한 토론 평가입니다. 최고 점수가 반영되어 있습니다.',
  };
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return '토론 서버가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (err.status === 408 || err.message.toLowerCase().includes('timeout')) {
      return '토론 생성 시간이 초과되었습니다. 다시 시도해 주세요.';
    }
    return err.message || fallback;
  }
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return '토론 생성 시간이 초과되었습니다. 다시 시도해 주세요.';
  }
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return '토론 생성 시간이 초과되었습니다. 다시 시도해 주세요.';
  }
  return fallback;
}

const AVATAR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20.4c0-3.9 3.4-6.3 7.5-6.3s7.5 2.4 7.5 6.3" />
  </svg>
);

type FloorItem =
  | { kind: 'turn'; turn: Stage3Turn; checked: boolean | null }
  | { kind: 'verdict'; tag: string; label: string; picked: string };

type Phase = 'guide' | 'decide' | 'fill' | 'next' | 'judge' | 'done';

function Toast({ message }: { message: string }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}

function Grounds({ turn, interactive }: { turn: Stage3Turn; interactive?: boolean }) {
  const items = (turn.grounds || []).filter(Boolean);
  const toggle = (e: MouseEvent<HTMLElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    e.currentTarget.classList.toggle('hl-user');
  };
  if (items.length > 1) {
    return (
      <span className="claim">
        <b>핵심 근거</b>
        <ol className="claim-list">
          {items.map((g) => (
            <li key={g} onClick={toggle}>
              {g}
            </li>
          ))}
        </ol>
      </span>
    );
  }
  return (
    <span className="claim" onClick={toggle}>
      <b>핵심 근거</b>
      {turn.claim || items[0] || ''}
    </span>
  );
}

function HighlightBubble({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bubble = ref.current;
    if (!bubble || !enabled) return;

    const unwrap = (mark: HTMLElement) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    };
    const markFromNode = (node: Node | null) => {
      let current: Node | null = node;
      if (current && current.nodeType === 3) current = current.parentElement;
      return current instanceof Element ? current.closest('mark.hl-user') : null;
    };
    const wrapSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
      const range = sel.getRangeAt(0);
      if (!bubble.contains(range.commonAncestorContainer)) return false;
      if (!sel.toString().trim()) return false;
      const startMark = markFromNode(range.startContainer);
      const endMark = markFromNode(range.endContainer);
      if (startMark && startMark === endMark && bubble.contains(startMark)) {
        unwrap(startMark as HTMLElement);
        sel.removeAllRanges();
        return true;
      }
      const mark = document.createElement('mark');
      mark.className = 'hl-user';
      try {
        range.surroundContents(mark);
      } catch {
        mark.appendChild(range.extractContents());
        range.insertNode(mark);
      }
      sel.removeAllRanges();
      return true;
    };

    let justWrapped = false;
    const onMouseUp = () => {
      justWrapped = wrapSelection();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const mark = target?.closest('mark.hl-user');
      if (!mark || !bubble.contains(mark)) return;
      e.preventDefault();
      e.stopPropagation();
      if (justWrapped) {
        justWrapped = false;
        return;
      }
      unwrap(mark as HTMLElement);
    };
    bubble.addEventListener('mouseup', onMouseUp);
    bubble.addEventListener('click', onClick);
    return () => {
      bubble.removeEventListener('mouseup', onMouseUp);
      bubble.removeEventListener('click', onClick);
    };
  }, [enabled]);

  return (
    <div className={`bubble${enabled ? ' selectable' : ''}`} ref={ref}>
      {children}
    </div>
  );
}

/** stage3_ui 학생 토론장 — 항상 백엔드 API 사용 */
export function StudentStage3Activity({
  assignmentId,
  skipIntroGuide = false,
}: {
  assignmentId: string;
  skipIntroGuide?: boolean;
}) {
  const [debate, setDebate] = useState<Stage3Debate>(() => createEmptyDebate());
  const [floor, setFloor] = useState<FloorItem[]>([]);
  const [idx, setIdx] = useState(-1);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<Phase>('guide');
  const [guideOpen, setGuideOpen] = useState(!skipIntroGuide);
  const [orderOpen, setOrderOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceArticles, setSourceArticles] = useState<Stage3SourceItem[]>([]);
  const [sourceSearches, setSourceSearches] = useState<Stage3SourceItem[]>([]);
  const [sourceQuote, setSourceQuote] = useState('');
  const [whyText, setWhyText] = useState('');
  const [groundText, setGroundText] = useState('');
  const [judgeText, setJudgeText] = useState('');
  const [corrections, setCorrections] = useState<
    Record<string, { highlight: string; why: string; ground: string }>
  >({});
  const [starting, setStarting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [, setAlreadySubmitted] = useState(false);
  const completedRef = useRef(false);
  const [langLabel, setLangLabel] = useState('과제 확인 중');
  const [langOk, setLangOk] = useState(false);
  const [toast, setToast] = useState('');
  const [result, setResult] = useState<Stage3GradeResult | null>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const readyRef = useRef(false);
  const decisionsRef = useRef<Record<string, boolean>>({});
  const debateRef = useRef(debate);

  useEffect(() => {
    debateRef.current = debate;
  }, [debate]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    readyRef.current = false;
    completedRef.current = false;
    getStudentStep3Api(assignmentId)
      .then((detail) => {
        if (cancelled) return;
        setDebate((prev) => ({
          ...prev,
          topic: detail.topic || prev.topic,
          pro: { ...prev.pro, role: detail.pro_persona || prev.pro.role },
          con: { ...prev.con, role: detail.con_persona || prev.con.role },
        }));
        setLangOk(true);
        setLangLabel('과제 연결됨');
        const completed = detail.submitted || detail.status === 'COMPLETED';
        if (completed) {
          completedRef.current = true;
          setAlreadySubmitted(true);
          setResult(resultFromCompleted(detail));
          setPhase('done');
          setGuideOpen(false);
        }
        readyRef.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        setLangOk(false);
        setLangLabel('연결 실패');
        setLoadError(apiErrorMessage(err, '과제를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  useEffect(() => {
    if (floorRef.current) floorRef.current.scrollTop = floorRef.current.scrollHeight;
  }, [floor]);

  const currentTurn = idx >= 0 ? debate.turns[idx] : null;
  const doneCount = Object.keys(decisions).length;
  const speakingSide =
    (phase === 'decide' || phase === 'fill') && currentTurn ? currentTurn.side : null;

  const pushTurn = (turn: Stage3Turn) => {
    setFloor((prev) => {
      if (prev.some((p) => p.kind === 'turn' && p.turn.id === turn.id)) return prev;
      return [...prev, { kind: 'turn', turn, checked: null }];
    });
  };

  const applyDebateStart = (nextDebate: Stage3Debate) => {
    debateRef.current = nextDebate;
    setDebate(nextDebate);
    setGuideOpen(false);
    decisionsRef.current = {};
    setDecisions({});
    setIdx(0);
    setFloor(
      nextDebate.turns[0]
        ? [{ kind: 'turn', turn: nextDebate.turns[0], checked: null }]
        : [],
    );
    setPhase('decide');
  };

  const begin = async () => {
    if (startedRef.current || deciding || submitting) return;
    startedRef.current = true;
    setStarting(true);
    setLoadError('');
    setLangLabel('토론 생성 중');
    try {
      const res = await postStudentStep3DebateApi(assignmentId);
      applyDebateStart(debateFromPublic(res.debate));
      setLangOk(true);
      setLangLabel('토론 준비 완료');
      setToast(
        res.reused
          ? '저장된 토론을 불러왔습니다.'
          : `토론 준비 완료 (${res.debate.elapsed ?? '?'}초)`,
      );
    } catch (err) {
      startedRef.current = false;
      setLangOk(false);
      setLangLabel('연결 실패');
      setToast(apiErrorMessage(err, '토론을 시작하지 못했습니다.'));
      setPhase('guide');
      setGuideOpen(true);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!skipIntroGuide) return;
    let cancelled = false;
    const waitAndStart = async () => {
      for (let i = 0; i < 80; i += 1) {
        if (cancelled) return;
        if (readyRef.current) break;
        await new Promise((r) => window.setTimeout(r, 100));
      }
      if (!readyRef.current) return;
      if (cancelled || completedRef.current) return;
      await begin();
    };
    void waitAndStart();
    return () => {
      cancelled = true;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipIntroGuide, assignmentId]);

  const collectHighlights = (turnId: string) => {
    const root = document.getElementById(`say-${turnId}`);
    if (!root) return '';
    const bits = [
      ...[...root.querySelectorAll('mark.hl-user')].map((n) => n.textContent?.trim() || ''),
      ...[...root.querySelectorAll('.claim.hl-user, .claim-list li.hl-user')].map((n) =>
        (n.textContent || '').replace(/^핵심 근거/, '').trim(),
      ),
    ].filter(Boolean);
    return [...new Set(bits)].join(' / ');
  };

  const hasHighlight = (turnId: string) => {
    const root = document.getElementById(`say-${turnId}`);
    return Boolean(root?.querySelector('mark.hl-user, .hl-user'));
  };

  const openSource = async (turn: Stage3Turn) => {
    const highlighted = collectHighlights(turn.id);
    const claim = highlighted || turn.claim || turn.grounds?.[0] || '';
    setSourceQuote(claim || turn.text || '');
    setSourceOpen(true);
    setSourceLoading(true);
    setSourceArticles([]);
    setSourceSearches([]);
    try {
      const data = await postStudentStep3SourcesApi(assignmentId, {
        turn_id: turn.id,
        claim,
      });
      setSourceArticles(dedupeSourceItems(data.articles || []));
      setSourceSearches(dedupeSourceItems(data.searches || []));
    } catch (err) {
      setToast(apiErrorMessage(err, '출처를 찾지 못했습니다.'));
    } finally {
      setSourceLoading(false);
    }
  };

  const applyDecision = (turn: Stage3Turn, checked: boolean, revealed: Stage3Turn) => {
    const nextDecisions = { ...decisionsRef.current, [turn.id]: checked };
    decisionsRef.current = nextDecisions;
    setDecisions(nextDecisions);
    const isLast = idx >= debateRef.current.turns.length - 1;
    setFloor((prev) =>
      prev.map((item) =>
        item.kind === 'turn' && item.turn.id === turn.id
          ? { ...item, turn: revealed, checked }
          : item,
      ),
    );
    if (!checked) {
      setToast('검증 없이 넘어갔습니다.');
      setPhase(isLast ? 'judge' : 'next');
    }
  };

  const applyFactcheckResult = (turn: Stage3Turn, revealed: Stage3Turn) => {
    const picked = collectHighlights(turn.id);
    const nextDecisions = { ...decisionsRef.current, [turn.id]: true };
    decisionsRef.current = nextDecisions;
    setDecisions(nextDecisions);
    setFloor((prev) => {
      const next = prev.map((item) =>
        item.kind === 'turn' && item.turn.id === turn.id
          ? { ...item, turn: revealed, checked: true }
          : item,
      );
      const suspicious =
        (revealed.claims || []).some((c) =>
          ['exaggerated', 'unsupported', 'false'].includes(c.verdict),
        ) || ['exaggerated', 'unsupported', 'false'].includes(revealed.verdict);
      const tag = suspicious ? revealed.verdict || 'exaggerated' : 'misscheck';
      const label = suspicious ? VERDICT_LABEL[revealed.verdict] || '과장됨' : '잘못 체크함';
      next.push({ kind: 'verdict', tag, label, picked });
      return next;
    });
    setDebate((prev) => ({
      ...prev,
      turns: prev.turns.map((t) => (t.id === turn.id ? revealed : t)),
    }));
  };

  const proceedToFill = () => {
    if (!currentTurn || phase !== 'decide' || deciding || starting) return;
    if (!hasHighlight(currentTurn.id)) {
      setToast('의심되는 부분을 먼저 하이라이트해 주세요.');
      return;
    }
    setPhase('fill');
  };

  const skipVerify = () => {
    if (!currentTurn || phase !== 'decide' || deciding || starting) return;
    applyDecision(currentTurn, false, currentTurn);
  };

  const submitFillAndFactcheck = async () => {
    if (!currentTurn || phase !== 'fill' || deciding || starting) return;
    const turn = currentTurn;
    if (whyText.trim().length < 8 || groundText.trim().length < 8) {
      setToast('두 칸을 모두 채워 주세요.');
      return;
    }
    setCorrections((prev) => ({
      ...prev,
      [turn.id]: {
        highlight: collectHighlights(turn.id),
        why: whyText.trim(),
        ground: groundText.trim(),
      },
    }));
    setDeciding(true);
    try {
      const fc = await postStudentStep3FactcheckApi(assignmentId, { turn_id: turn.id });
      const claims =
        fc.claims?.length > 0
          ? fc.claims.map((c) => ({
              claim: c.claim,
              verdict: toUiVerdict(c.verdict),
              reason: c.reason || fc.why,
            }))
          : [{ claim: turn.claim, verdict: toUiVerdict(fc.verdict), reason: fc.why }];
      const revealed: Stage3Turn = {
        ...turn,
        verdict: toUiVerdict(fc.verdict),
        why: fc.why,
        claims,
      };
      applyFactcheckResult(turn, revealed);
      setWhyText('');
      setGroundText('');
      const isLast = idx >= debateRef.current.turns.length - 1;
      if (isLast) setPhase('judge');
      else advance();
    } catch (err) {
      setToast(apiErrorMessage(err, '팩트체크 요청에 실패했습니다.'));
    } finally {
      setDeciding(false);
    }
  };

  const goResult = async (finalDecisions: Record<string, boolean>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await postStudentStep3SubmitApi(assignmentId, {
        decisions: Object.entries(finalDecisions).map(([turn_id, checked]) => ({
          turn_id,
          checked,
        })),
        corrections: Object.entries(corrections).map(([turn_id, item]) => ({
          turn_id,
          highlight: item.highlight,
          why_wrong: item.why,
          correct_ground: item.ground,
        })),
      });
      setResult({
        ...resultFromSubmit(res, debateRef.current, { judgment: judgeText, corrections }),
        judgment: judgeText,
        corrections,
      });
      setAlreadySubmitted(true);
      setPhase('done');
    } catch (err) {
      setToast(apiErrorMessage(err, '제출에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  const advance = () => {
    if (idx >= debate.turns.length - 1) {
      setPhase('judge');
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    pushTurn(debate.turns[nextIdx]);
    setPhase('decide');
  };

  const finishFill = () => {
    void submitFillAndFactcheck();
  };

  const finishJudge = () => {
    if (judgeText.trim().length < 12) {
      setToast('결론을 조금 더 구체적으로 적어 주세요.');
      return;
    }
    void goResult(decisions);
  };

  if (phase === 'done' && result) {
    return <StudentStage3Done result={result} />;
  }

  if (loading) {
    return (
      <div className="s3">
        <div className="shell">
          <p className="hint">과제를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="s3">
        <div className="shell">
          <p className="hint" style={{ color: '#b91c1c' }}>
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="s3">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · AI 토론</span>
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
          <div className="step">과제 선택</div>
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
              {phase === 'judge'
                ? '결론'
                : `발언 ${Math.min(Math.max(idx + 1, 0), debate.turns.length)} / ${debate.turns.length || 6}`}
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
            {floor.length === 0 && (
              <p className="floor-empty">
                {starting ? 'AI가 토론을 준비하는 중…' : '토론을 시작해 주세요.'}
              </p>
            )}
            {floor.map((item, i) =>
              item.kind === 'turn' ? (
                <div
                  key={item.turn.id}
                  id={`say-${item.turn.id}`}
                  className={`say ${item.turn.side}${item.checked === null ? ' pending' : ''}`}
                >
                  <div className="say-meta">
                    <span className="name">{debate[item.turn.side].name}</span>
                    <span>{item.turn.round}</span>
                  </div>
                  <HighlightBubble enabled={item.checked === null && phase === 'decide'}>
                    {item.turn.text}
                    <Grounds turn={item.turn} interactive={item.checked === null && phase === 'decide'} />
                  </HighlightBubble>
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
                      <span className={`verdict-tag ${item.tag}`}>{item.label}</span>
                    </div>
                    {item.picked ? <p className="why">표시한 부분 · {item.picked}</p> : null}
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
              <p className="decide-q">
                {starting ? 'AI가 토론을 준비하는 중…' : '아직 토론이 시작되지 않았습니다'}
              </p>
              <p className="decide-sub">
                {starting
                  ? '잠시만 기다려 주세요. 준비가 끝나면 첫 발언이 나타납니다.'
                  : '아래 버튼으로 토론을 시작할 수 있습니다.'}
              </p>
              {!starting && (
                <div className="decide-actions">
                  <button className="btn btn-primary" type="button" onClick={() => void begin()}>
                    토론 시작하기
                  </button>
                </div>
              )}
            </>
          )}
          {phase === 'decide' && currentTurn && (
            <>
              <p className="decide-q">의심되는 부분을 칠한 뒤 틀린 이유를 작성하세요</p>
              <p className="decide-sub">
                문장을 드래그하거나 핵심 근거를 누르면 표시됩니다. 같은 부분을 다시 칠하면 취소됩니다.
              </p>
              <div className="decide-actions">
                <button className="btn btn-ghost" type="button" disabled={deciding} onClick={() => void openSource(currentTurn)}>
                  출처 확인
                </button>
                <button className="btn btn-check" type="button" disabled={deciding} onClick={proceedToFill}>
                  틀린 이유 작성하기
                </button>
                <button className="btn btn-ghost" type="button" disabled={deciding} onClick={skipVerify}>
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
          {phase === 'fill' && currentTurn && (
            <>
              <p className="decide-q">틀린 이유와 맞은 근거를 채운 뒤 팩트체커를 누르세요</p>
              <p className="decide-sub">왜 문제인지, 바른 근거는 무엇인지 먼저 직접 적은 다음 팩트체커로 검증합니다.</p>
              <div className="fix-box">
                <label className="label" htmlFor="whyInput">틀린 이유</label>
                <textarea
                  className="field"
                  id="whyInput"
                  rows={2}
                  placeholder="이 부분이 왜 과장·오류인지 적어 보세요."
                  value={whyText}
                  onChange={(e) => setWhyText(e.target.value)}
                />
                <label className="label" htmlFor="groundInput">맞은 근거</label>
                <textarea
                  className="field"
                  id="groundInput"
                  rows={2}
                  placeholder="바르게 고친 근거를 적어 보세요."
                  value={groundText}
                  onChange={(e) => setGroundText(e.target.value)}
                />
              </div>
              <div className="decide-actions">
                <button className="btn btn-ghost" type="button" disabled={deciding} onClick={() => void openSource(currentTurn)}>
                  출처 확인
                </button>
                <button
                  className="btn btn-check"
                  type="button"
                  disabled={deciding || whyText.trim().length < 8 || groundText.trim().length < 8}
                  onClick={finishFill}
                >
                  {deciding ? '검증 요청 중…' : '팩트체커에게 검증 요청'}
                </button>
              </div>
            </>
          )}
          {phase === 'next' && (
            <>
              <p className="decide-q">다음 발언을 들어 보세요</p>
              <p className="decide-sub">상대 측이 이어서 발언합니다.</p>
              <div className="decide-actions">
                <button className="btn btn-primary" type="button" onClick={advance}>
                  다음 발언 듣기
                </button>
              </div>
            </>
          )}
          {phase === 'judge' && (
            <>
              <p className="decide-q">사회자로서 결론을 내려 주세요</p>
              <p className="decide-sub">어느 쪽 근거가 더 믿을 만했는지, 왜 그렇게 보는지 적어 주세요. 이 결론은 팩트체커 점수와 별개입니다.</p>
              <div className="fix-box">
                <label className="label" htmlFor="judgeInput">내 판정</label>
                <textarea
                  className="field"
                  id="judgeInput"
                  rows={4}
                  placeholder="예: 반대 측의 개인정보 지적이 더 구체적이었습니다."
                  value={judgeText}
                  onChange={(e) => setJudgeText(e.target.value)}
                />
              </div>
              <div className="decide-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={submitting || judgeText.trim().length < 12}
                  onClick={finishJudge}
                >
                  {submitting ? '채점 중…' : '평가 결과 보기'}
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
                    <strong>두 AI가 입론·반론·최종 변론을 주고받습니다</strong>
                    <p>찬성 입론 → 반대 입론 → 반대 반론 → 찬성 반론 → 반대 최종 변론 → 찬성 최종 변론 순서로 진행된 뒤, 여러분이 결론을 내립니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">2</span>
                  <div>
                    <strong>발언마다 검증할지 정합니다</strong>
                    <p>
                      의심되는 문장을 <b>직접 하이라이트</b>한 뒤 틀린 이유와 맞은 근거를 적고,
                      마지막에 팩트체커로 검증합니다.
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
                시작을 누르면 Langflow가 입론·반론·최종 변론을 준비합니다. 약 50초 걸릴 수 있습니다.
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
                <span className="order-chip pro">찬성 입론</span>
                <span className="order-arrow">→</span>
                <span className="order-chip con">반대 입론</span>
                <span className="order-arrow">→</span>
                <span className="order-chip con">반대 반론</span>
                <span className="order-arrow">→</span>
                <span className="order-chip pro">찬성 반론</span>
                <span className="order-arrow">→</span>
                <span className="order-chip con">반대 최종</span>
                <span className="order-arrow">→</span>
                <span className="order-chip pro">찬성 최종</span>
                <span className="order-arrow">→</span>
                <span className="order-chip check">결론 · 사용자 판정</span>
              </div>
              <ol className="guide-list">
                <li>
                  <span className="guide-num">1</span>
                  <div>
                    <strong>입론 · 주장을 펼칩니다</strong>
                    <p>찬성 측이 논제·배경·근거를 제시하고, 반대 측이 반대 주장과 근거를 제시합니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">2</span>
                  <div>
                    <strong>반론 · 허점을 지적합니다</strong>
                    <p>반대 측이 찬성 주장의 타당성을 찌른 뒤, 찬성 측이 그 반박을 재반박하고 주장을 강화합니다.</p>
                  </div>
                </li>
                <li>
                  <span className="guide-num">3</span>
                  <div>
                    <strong>최종 변론 · 핵심을 정리합니다</strong>
                    <p>반대 측이 먼저 마무리하고, 찬성 측이 마지막 발언을 합니다. 마지막에 여러분이 결론을 내립니다.</p>
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

      {sourceOpen && (
        <div
          className="modal open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSourceOpen(false);
          }}
        >
          <div className="modal-card">
            <header>
              <h2>근거 출처 확인</h2>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setSourceOpen(false)}>
                닫기
              </button>
            </header>
            <div className="modal-body">
              {sourceQuote ? <p className="source-quote">“{sourceQuote}”</p> : null}
              {sourceLoading ? <p className="hint">관련 뉴스·기사·인터뷰를 찾는 중…</p> : null}
              {!sourceLoading && (
                <>
                  {sourceArticles.length > 0 ? (
                    <>
                      <p className="hint">이 근거와 관련된 뉴스·인터뷰입니다. 제목을 누르면 원문이 열립니다.</p>
                      <div className="source-list">
                        {sourceArticles.map((item) => (
                          <a
                            key={item.url}
                            className="source-item"
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="src">
                              {item.kind || '뉴스'}
                              {item.source ? ` · ${item.source}` : ''}
                            </span>
                            <span className="title">{item.title}</span>
                          </a>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="hint">관련 기사를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
                  )}
                </>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" type="button" onClick={() => setSourceOpen(false)}>
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

export function buildStage3GradeResultFromDetail(
  detail: Stage3AssignmentDetailResponse,
): Stage3GradeResult {
  return resultFromCompleted(detail);
}

export function StudentStage3Done({
  result,
  embedded = false,
}: {
  result: Stage3GradeResult;
  embedded?: boolean;
}) {
  const [filter, setFilter] = useState<Stage3Outcome | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const MARK = {
    caught: { cls: 'ok', label: '정확히 잡아냄' },
    passed: { cls: 'ok', label: '적절히 넘어감' },
    missed: { cls: 'miss', label: '놓침' },
    wasted: { cls: 'waste', label: '불필요한 검증' },
  } as const;

  const TALLY_ITEMS = [
    { outcome: 'caught' as const, tone: 'good' as const, label: '허술한 근거를 잡아냄', count: result.caught },
    { outcome: 'passed' as const, tone: 'good' as const, label: '탄탄한 근거를 넘어감', count: result.passed },
    { outcome: 'missed' as const, tone: 'bad' as const, label: '놓친 근거', count: result.missed },
    { outcome: 'wasted' as const, tone: 'bad' as const, label: '불필요한 검증', count: result.wasted },
  ];

  const FILTER_HEADLINE: Record<Stage3Outcome, string> = {
    caught: '허술한 근거를 잡아낸 발언',
    passed: '탄탄한 근거를 넘어간 발언',
    missed: '놓친 발언',
    wasted: '불필요하게 검증한 발언',
  };

  const filteredRows = filter ? result.rows.filter((row) => row.outcome === filter) : [];

  const selectFilter = (outcome: Stage3Outcome) => {
    setFilter((prev) => {
      const next = prev === outcome ? null : outcome;
      if (next) {
        window.requestAnimationFrame(() => {
          reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return next;
    });
  };

  const body = (
    <>
        <section className="score-hero">
          <div className="score-ring" style={{ ['--p' as string]: String(result.score) }}>
            <div className="inner">
              <strong>{result.score}</strong>
              <span>종합 점수</span>
            </div>
          </div>
          <div className="score-copy">
            <h1>{result.headline}</h1>
            <p>{result.advice}</p>
            <p className="hint hint-sm" style={{ marginTop: 10 }}>
              팩트체커 사용 {result.usageScore}점 · 근거 설명 {result.reasoningScore}점
            </p>
            <p className="hint hint-sm" style={{ marginTop: 6 }}>
              {result.topic}
            </p>
          </div>
        </section>

        {result.judgment ? (
          <section className="info-card" style={{ marginBottom: 22 }}>
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">내 결론</p>
            </div>
            <p className="mission-text">{result.judgment}</p>
          </section>
        ) : null}

        <div className="tally" role="group" aria-label="판정 결과 요약">
          {TALLY_ITEMS.map((item) => (
            <button
              key={item.outcome}
              type="button"
              className={`tally-item ${item.tone}${filter === item.outcome ? ' is-active' : ''}`}
              aria-pressed={filter === item.outcome}
              onClick={() => selectFilter(item.outcome)}
            >
              <strong>{item.count}</strong>
              <span>{item.label}</span>
            </button>
          ))}
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

        {filter ? (
          <>
            <div className="debate-head" ref={reviewRef}>
              <div>
                <h1>{FILTER_HEADLINE[filter]}</h1>
                <p className="topic">내 판단과 팩트체커의 판정을 나란히 확인해 보세요.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter(null)}>
                닫기
              </button>
            </div>

            <div className="review">
              {filteredRows.length === 0 ? (
                <p className="hint">해당하는 발언이 없습니다.</p>
              ) : (
                filteredRows.map((row) => {
                  const mark = MARK[row.outcome] ?? MARK.passed;
                  const wrong = row.outcome === 'missed' || row.outcome === 'wasted';
                  return (
                    <div key={row.id} className={`review-row${wrong ? ' is-wrong' : ''}`}>
                      <span className={`side ${row.side}`}>{row.side === 'pro' ? '찬성' : '반대'}</span>
                      <div className="claim-text">
                        {row.claim}
                        <em>
                          팩트체커 판정 · {VERDICT_LABEL[row.verdict] || row.verdict}
                        </em>
                        {result.corrections?.[row.id]?.highlight ? (
                          <em>표시한 부분 — {result.corrections[row.id].highlight}</em>
                        ) : null}
                        {result.corrections?.[row.id]?.why ? (
                          <em>틀린 이유 — {result.corrections[row.id].why}</em>
                        ) : null}
                        {result.corrections?.[row.id]?.ground ? (
                          <em>맞은 근거 — {result.corrections[row.id].ground}</em>
                        ) : null}
                        {result.correctionGrades?.[row.id]?.feedback ? (
                          <em>근거 설명 피드백 — {result.correctionGrades[row.id].feedback}</em>
                        ) : null}
                      </div>
                      <span className={`mark ${mark.cls}`}>{mark.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <p className="hint tally-hint">위 카드를 누르면 판정 결과별로 발언을 확인할 수 있습니다.</p>
        )}

        {!embedded ? (
          <div className="actions" style={{ marginTop: 24 }}>
            <p className="hint">최고 점수가 저장되어 있습니다.</p>
          </div>
        ) : null}
    </>
  );

  if (embedded) {
    return <div className="s3 s3-embedded">{body}</div>;
  }

  return (
    <div className="s3">
      <div className="shell wide">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · AI 토론</span>
          </div>
        </header>
        <nav className="steps" aria-label="진행 단계">
          <div className="step">과제 선택</div>
          <div className="step">토론 평가</div>
          <div className="step" aria-current="step">
            결과 확인
          </div>
        </nav>
        {body}
      </div>
    </div>
  );
}
