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

/** Stage1 학생 채팅 고정 질문 (백엔드 STAGE1_FIXED_GUIDELINE과 동일) */
export const STAGE1_FIXED_CHAT_PROMPT = '오늘 학습 주제의 내용을 전체적으로 알려줘';

/** guideline 문구에서 따옴표 안 질문을 뽑는다. 없으면 고정 질문. */
export function resolveStage1ChatPrompt(guideline?: string | null): string {
  const matched = guideline?.match(/"([^"]+)"/);
  const fromGuideline = matched?.[1]?.trim();
  return fromGuideline || STAGE1_FIXED_CHAT_PROMPT;
}
