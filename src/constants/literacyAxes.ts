/** 울산형 AI 리터러시 6축 · 17차 회의 통합점수 매핑 */

export type LiteracyAxisKey =
  | 'ai_operation'
  | 'hallucination'
  | 'ai_response'
  | 'critical'
  | 'collaboration'
  | 'ethics';

export interface LiteracyAxis {
  key: LiteracyAxisKey;
  label: string;
  /** 정식 울산형 용어 */
  formal: string;
}

export const LITERACY_AXES: LiteracyAxis[] = [
  { key: 'ai_operation', label: 'AI 동작 이해', formal: '생성형 AI 동작 이해' },
  { key: 'hallucination', label: 'Hallucination 이해', formal: '환각 이해' },
  { key: 'ai_response', label: 'AI 응답 이해', formal: '추론 한계 이해' },
  { key: 'critical', label: '비판적 사고', formal: '비판적 활용' },
  { key: 'collaboration', label: 'AI 협업', formal: 'AI 협업' },
  { key: 'ethics', label: 'AI 윤리', formal: '윤리적 활용' },
];

/** 단계 → 주요 리터러시 역량 (17차 회의 · 채원 자료) */
export const STAGE_LITERACY_MAP: Record<number, LiteracyAxisKey[]> = {
  1: ['ai_operation', 'ai_response', 'collaboration'],
  2: ['hallucination', 'critical', 'ai_response'],
  3: ['collaboration', 'critical', 'ai_response'],
  4: ['ethics', 'critical', 'collaboration'],
};

export const STAGE_SCENARIO_LABELS: Record<number, string> = {
  1: 'RAG 체험',
  2: 'Hallucination 탐지',
  3: 'AI 토론',
  4: '보안 강화',
};

export type LiteracyScores = Record<LiteracyAxisKey, number | null>;

export function emptyLiteracyScores(): LiteracyScores {
  return {
    ai_operation: null,
    hallucination: null,
    ai_response: null,
    critical: null,
    collaboration: null,
    ethics: null,
  };
}

/** 단계별 점수로 6축 점수 산출 (해당 축에 매핑된 단계 점수 평균) */
export function deriveLiteracyScores(
  stages: { stage: number; score?: number | null; status?: string }[],
): LiteracyScores {
  const buckets: Record<LiteracyAxisKey, number[]> = {
    ai_operation: [],
    hallucination: [],
    ai_response: [],
    critical: [],
    collaboration: [],
    ethics: [],
  };

  for (const item of stages) {
    if (item.score == null) continue;
    const keys = STAGE_LITERACY_MAP[item.stage];
    if (!keys) continue;
    for (const key of keys) {
      buckets[key].push(Math.max(0, Math.min(100, item.score)));
    }
  }

  const out = emptyLiteracyScores();
  (Object.keys(buckets) as LiteracyAxisKey[]).forEach((key) => {
    const vals = buckets[key];
    out[key] = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : null;
  });
  return out;
}

export function averageLiteracyScore(scores: LiteracyScores): number {
  const vals = LITERACY_AXES.map((a) => scores[a.key]).filter((v): v is number => v != null);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function axisLabelsForStage(stage: number): string {
  const keys = STAGE_LITERACY_MAP[stage] ?? [];
  return keys
    .map((k) => LITERACY_AXES.find((a) => a.key === k)?.label)
    .filter(Boolean)
    .join(' · ');
}
