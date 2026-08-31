/**
 * 울산형 AI 리터러시 6축 — 표시용 상수·API 매핑.
 * 점수 환산은 백엔드 `literacy_scorer`가 담당한다.
 */

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

/** 단계 → 주요 리터러시 역량 (표시·안내용, 환산은 백엔드와 동일 표) */
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

export function averageLiteracyScore(scores: LiteracyScores): number {
  const vals = LITERACY_AXES.map((a) => scores[a.key]).filter((v): v is number => v != null);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** 백엔드 literacy_axes → 화면용. 없으면 전부 미이수. */
export function literacyScoresFromApi(
  axes?: Partial<LiteracyScores> | null,
): LiteracyScores {
  const out = emptyLiteracyScores();
  if (!axes) return out;
  for (const key of Object.keys(out) as LiteracyAxisKey[]) {
    const v = axes[key];
    if (v != null && Number.isFinite(v)) {
      out[key] = Math.max(0, Math.min(100, Math.round(v)));
    }
  }
  return out;
}

export function axisLabelsForStage(stage: number): string {
  const keys = STAGE_LITERACY_MAP[stage] ?? [];
  return keys
    .map((k) => LITERACY_AXES.find((a) => a.key === k)?.label)
    .filter(Boolean)
    .join(' · ');
}
