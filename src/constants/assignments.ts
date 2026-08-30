export const HALLUCINATION_LABELS: Record<string, string> = {
  PERSONA_BIAS: '페르소나 편향',
  INFORMATION_FABRICATION: '정보 날조',
  RETRIEVAL_ERROR: '잘못된 문서 검색',
};

export const FALLBACK_HALLUCINATION_OPTIONS = [
  {
    value: 'PERSONA_BIAS',
    label: HALLUCINATION_LABELS.PERSONA_BIAS,
    description: '잘못된 믿음을 가진 AI가 답변을 조작',
  },
  {
    value: 'INFORMATION_FABRICATION',
    label: HALLUCINATION_LABELS.INFORMATION_FABRICATION,
    description: '교재에 없는 허위 사실을 생성',
  },
  {
    value: 'RETRIEVAL_ERROR',
    label: HALLUCINATION_LABELS.RETRIEVAL_ERROR,
    description: '무관한 청크를 참고하여 오류 발생',
  },
] as const;

export const SUBJECT_OPTIONS = [
  { value: 'hist', label: '한국사' },
  { value: 'sci', label: '과학' },
  { value: 'soc', label: '사회' },
] as const;

export type SubjectValue = (typeof SUBJECT_OPTIONS)[number]['value'];

export function normalizeSubjectKey(value?: string | null): SubjectValue {
  const hit = SUBJECT_OPTIONS.find((s) => s.value === value);
  return hit?.value ?? 'hist';
}

export function subjectLabel(value?: string | null): string {
  const hit = SUBJECT_OPTIONS.find((s) => s.value === value);
  if (hit) return hit.label;
  if (value === '한국사' || value === '과학' || value === '사회') return value;
  return '한국사';
}
