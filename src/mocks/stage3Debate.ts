/** stage3_ui SAMPLE + 채점 로직 */

export type Stage3Verdict = 'supported' | 'exaggerated' | 'unsupported' | 'false';

export interface Stage3Claim {
  claim: string;
  verdict: Stage3Verdict;
  reason: string;
}

export interface Stage3Turn {
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

export interface Stage3Debate {
  topic: string;
  source: string;
  pro: { name: string; role: string };
  con: { name: string; role: string };
  turns: Stage3Turn[];
  elapsed?: string | number;
}

export interface Stage3Assignment {
  topic: string;
  proPersona: string;
  conPersona: string;
}

export type Stage3Outcome = 'caught' | 'passed' | 'missed' | 'wasted';

export interface Stage3GradeRow extends Stage3Turn {
  checked: boolean;
  suspicious: boolean;
  outcome: Stage3Outcome;
}

export interface Stage3GradeResult {
  topic: string;
  source: string;
  rows: Stage3GradeRow[];
  caught: number;
  passed: number;
  missed: number;
  wasted: number;
  score: number;
  headline: string;
  advice: string;
}

export const STAGE3_ASSIGN_KEY = 'stage3_assignment';
export const STAGE3_RESULT_KEY = 'stage3_proto_result';

export const VERDICT_LABEL: Record<Stage3Verdict, string> = {
  supported: '근거 확인됨',
  exaggerated: '과장됨',
  unsupported: '근거 부족',
  false: '사실과 다름',
};

const NEEDS_CHECK: Stage3Verdict[] = ['exaggerated', 'unsupported', 'false'];
const PENALIZE_UNNECESSARY_CHECK = true;

export const STAGE3_SAMPLE: Stage3Debate = {
  topic: '학교에 AI 시험 감독 시스템을 도입해야 하는가?',
  source: 'sample',
  pro: { name: '찬성 측 AI', role: '효율성을 중시하는 교육 전문가' },
  con: { name: '반대 측 AI', role: '개인정보를 우려하는 인권 전문가' },
  turns: [
    {
      id: 'pro-1',
      side: 'pro',
      round: '1라운드 · 주장',
      text: '시험의 공정성은 학교가 지켜야 할 최소한의 약속입니다. 사람이 교실을 도는 방식으로는 한계가 분명합니다.',
      claim: 'AI 감독을 도입한 학교에서는 부정행위가 90% 이상 줄었습니다.',
      grounds: ['AI 감독을 도입한 학교에서는 부정행위가 90% 이상 줄었습니다.'],
      verdict: 'exaggerated',
      why: '보고된 감소폭은 학교와 과목에 따라 10~30% 수준입니다. 90%는 특정 업체 홍보 자료의 최대치를 전체에 적용한 표현으로, 출처가 확인되지 않습니다.',
      claims: [
        {
          claim: 'AI 감독을 도입한 학교에서는 부정행위가 90% 이상 줄었습니다.',
          verdict: 'exaggerated',
          reason:
            '보고된 감소폭은 학교와 과목에 따라 10~30% 수준입니다. 90%는 특정 업체 홍보 자료의 최대치를 전체에 적용한 표현으로, 출처가 확인되지 않습니다.',
        },
      ],
    },
    {
      id: 'con-1',
      side: 'con',
      round: '1라운드 · 반박',
      text: '공정성을 위해 무엇을 내주는지도 함께 봐야 합니다. 감독 시스템은 학생의 몸을 데이터로 다룹니다.',
      claim: '학생의 얼굴·시선 데이터는 개인정보보호법상 민감정보라 별도 동의가 필요합니다.',
      grounds: ['학생의 얼굴·시선 데이터는 개인정보보호법상 민감정보라 별도 동의가 필요합니다.'],
      verdict: 'supported',
      why: '생체인식정보는 개인정보보호법에서 민감정보로 분류되며, 원칙적으로 별도 동의를 받아야 합니다. 근거가 정확합니다.',
      claims: [
        {
          claim: '학생의 얼굴·시선 데이터는 개인정보보호법상 민감정보라 별도 동의가 필요합니다.',
          verdict: 'supported',
          reason:
            '생체인식정보는 개인정보보호법에서 민감정보로 분류되며, 원칙적으로 별도 동의를 받아야 합니다. 근거가 정확합니다.',
        },
      ],
    },
    {
      id: 'pro-2',
      side: 'pro',
      round: '2라운드 · 재반박',
      text: '동의 절차는 도입을 막을 이유가 아니라 설계에 반영할 조건입니다. 오히려 감독에서 풀려난 시간이 수업의 질을 높입니다.',
      claim: '감독에 쓰이던 교사의 시간을 채점과 피드백으로 돌릴 수 있습니다.',
      grounds: ['감독에 쓰이던 교사의 시간을 채점과 피드백으로 돌릴 수 있습니다.'],
      verdict: 'supported',
      why: '감독 인력을 다른 업무로 배치한다는 주장은 과장된 수치 없이 제시되었고, 논리적으로 무리가 없습니다.',
      claims: [
        {
          claim: '감독에 쓰이던 교사의 시간을 채점과 피드백으로 돌릴 수 있습니다.',
          verdict: 'supported',
          reason:
            '감독 인력을 다른 업무로 배치한다는 주장은 과장된 수치 없이 제시되었고, 논리적으로 무리가 없습니다.',
        },
      ],
    },
  ],
};

export function needsCheck(turn: Stage3Turn) {
  if (turn.claims?.length) {
    return turn.claims.some((c) => NEEDS_CHECK.includes(c.verdict));
  }
  return NEEDS_CHECK.includes(turn.verdict);
}

export function gradeDebate(
  turns: Stage3Turn[],
  decisions: Record<string, boolean>,
  topic: string,
  source: string,
): Stage3GradeResult {
  const rows: Stage3GradeRow[] = turns.map((turn) => {
    const checked = Boolean(decisions[turn.id]);
    const suspicious = needsCheck(turn);
    let outcome: Stage3Outcome;
    if (suspicious && checked) outcome = 'caught';
    else if (suspicious && !checked) outcome = 'missed';
    else if (!suspicious && checked) outcome = PENALIZE_UNNECESSARY_CHECK ? 'wasted' : 'caught';
    else outcome = 'passed';
    return { ...turn, checked, suspicious, outcome };
  });

  const caught = rows.filter((r) => r.outcome === 'caught').length;
  const passed = rows.filter((r) => r.outcome === 'passed').length;
  const missed = rows.filter((r) => r.outcome === 'missed').length;
  const wasted = rows.filter((r) => r.outcome === 'wasted').length;
  const correct = caught + passed;
  const score = rows.length ? Math.round((correct / rows.length) * 100) : 0;

  let headline: string;
  let advice: string;
  if (score >= 90) {
    headline = '팩트체커를 정확한 순간에 썼어요';
    advice = '의심할 발언과 넘어가도 될 발언을 거의 정확히 갈랐습니다.';
  } else if (score >= 70) {
    headline = '대체로 잘 판단했어요';
    advice = '몇 개만 더 잡아내면 완벽합니다. 아래에서 놓친 발언을 확인해 보세요.';
  } else if (score >= 50) {
    headline = '조금 더 의심해 볼까요';
    advice = '숫자가 들어간 주장은 특히 검증할 가치가 큽니다.';
  } else {
    headline = '검증 기준을 다시 세워 봐요';
    advice = "'구체적인 수치'와 '대부분·모두 같은 표현'이 나오면 팩트체커를 떠올려 보세요.";
  }

  if (missed === 0 && wasted > 0) {
    advice =
      '허술한 근거는 모두 잡아냈지만, 탄탄한 근거까지 검증했습니다. 검증도 비용이라는 점을 기억하세요.';
  } else if (wasted === 0 && missed > 0) {
    advice =
      '불필요한 검증은 없었지만 놓친 발언이 있습니다. 수치가 나오면 한 번 더 의심해 보세요.';
  }

  return { topic, source, rows, caught, passed, missed, wasted, score, headline, advice };
}

export function readStage3Assignment(): Stage3Assignment | null {
  try {
    const raw = sessionStorage.getItem(STAGE3_ASSIGN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stage3Assignment;
  } catch {
    return null;
  }
}

export function saveStage3Assignment(assignment: Stage3Assignment) {
  sessionStorage.setItem(STAGE3_ASSIGN_KEY, JSON.stringify(assignment));
}

export function saveStage3Result(result: Stage3GradeResult) {
  sessionStorage.setItem(STAGE3_RESULT_KEY, JSON.stringify(result));
}

export function readStage3Result(): Stage3GradeResult | null {
  try {
    const raw = sessionStorage.getItem(STAGE3_RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stage3GradeResult;
  } catch {
    return null;
  }
}

const API_CANDIDATES = ['', 'http://127.0.0.1:8600'];

async function fetchDebateApi(path: string, options?: RequestInit) {
  let lastErr: unknown;
  for (const base of API_CANDIDATES) {
    try {
      return await fetch(base + path, options);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('서버에 연결하지 못했습니다.');
}

export async function loadStage3Debate(assignment: Stage3Assignment | null): Promise<Stage3Debate> {
  const topic = (assignment?.topic || STAGE3_SAMPLE.topic).trim();
  const res = await fetchDebateApi('/api/debate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      mode: 'v2',
      pro_role: assignment?.proPersona || STAGE3_SAMPLE.pro.role,
      con_role: assignment?.conPersona || STAGE3_SAMPLE.con.role,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Stage3Debate & { error?: string };
  if (!res.ok) throw new Error(data.error || `토론 실행 실패 (${res.status})`);
  if (!data.turns?.length) throw new Error('에이전트 발언을 받지 못했습니다.');
  return data;
}

export async function checkStage3Langflow(): Promise<boolean> {
  try {
    const res = await fetchDebateApi('/api/status');
    const data = (await res.json()) as {
      langflow?: boolean;
      modes?: { key: string; ready?: boolean }[];
    };
    const v2 = (data.modes || []).find((m) => m.key === 'v2');
    return Boolean(data.langflow && v2?.ready);
  } catch {
    return false;
  }
}

export function cloneSampleDebate(assignment?: Stage3Assignment | null): Stage3Debate {
  return {
    ...STAGE3_SAMPLE,
    topic: assignment?.topic || STAGE3_SAMPLE.topic,
    pro: { ...STAGE3_SAMPLE.pro, role: assignment?.proPersona || STAGE3_SAMPLE.pro.role },
    con: { ...STAGE3_SAMPLE.con, role: assignment?.conPersona || STAGE3_SAMPLE.con.role },
    turns: STAGE3_SAMPLE.turns.map((t) => ({ ...t, claims: t.claims.map((c) => ({ ...c })) })),
    source: 'sample',
  };
}
