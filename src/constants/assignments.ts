export const HALLUCINATION_LABELS: Record<string, string> = {
  PERSONA_BIAS: '페르소나 편향',
  INFORMATION_FABRICATION: '정보 조작',
  RETRIEVAL_ERROR: '검색/근거 오류',
};

export const SUBJECT_OPTIONS = [
  { value: 'hist', label: '한국사' },
  { value: 'sci', label: '과학' },
  { value: 'soc', label: '사회' },
] as const;
