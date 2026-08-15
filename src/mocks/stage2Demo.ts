export type Stage2HallucType =
  | 'PERSONA_BIAS'
  | 'INFORMATION_FABRICATION'
  | 'RETRIEVAL_ERROR'
  | 'REASONING_ERROR';

export interface Stage2ErrorMark {
  id: string;
  text: string;
  correctType: Stage2HallucType;
}

export const STAGE2_HALLUC_OPTIONS: {
  value: Stage2HallucType;
  label: string;
  description: string;
}[] = [
  { value: 'PERSONA_BIAS', label: '페르소나 편향', description: '잘못된 믿음을 반영' },
  { value: 'INFORMATION_FABRICATION', label: '정보 날조', description: '없는 사실을 만듦' },
  { value: 'RETRIEVAL_ERROR', label: '잘못된 검색', description: '관련 없는 자료 참고' },
  { value: 'REASONING_ERROR', label: '추론 오류', description: '인과를 잘못 연결' },
];

export const STAGE2_DEMO = {
  title: 'Hallucination 탐지 · AI가 틀린 말 찾기',
  topic: '한국사 · 조선 시대 장영실의 과학 기술 업적',
  question: '장영실의 발명품에 대해 설명해줘.',
  persona: '장영실이 연을 만들었다고 믿는 한국사 선생님',
  referenceDoc:
    '장영실은 세종 시대의 과학자이다. 자격루와 측우기 등을 제작했으며, 연(鳶)을 발명했다는 기록은 없다. 을사조약은 1905년에 체결되었다.',
  flawedParts: [
    { id: 'before', text: '조선 시대 과학기술은 세종 대에 크게 발전했습니다. 장영실은 자격루와 측우기를 제작했죠. 또한 장영실은 조선 최초로 ' },
    {
      id: 'hl1',
      text: '연(鳶)을 발명해 군사 통신에 활용했습니다',
      error: true as const,
      correctType: 'PERSONA_BIAS' as Stage2HallucType,
    },
    { id: 'mid', text: '. 그리고 ' },
    {
      id: 'hl2',
      text: '을사조약은 1900년에 체결되어',
      error: true as const,
      correctType: 'INFORMATION_FABRICATION' as Stage2HallucType,
    },
    { id: 'after', text: ' 조선의 외교권을 빼앗겼습니다.' },
  ],
  expectedErrorCount: 2,
  maxAttempts: 4,
};

export function getStage2ErrorMarks(): Stage2ErrorMark[] {
  return STAGE2_DEMO.flawedParts
    .filter((p): p is Extract<(typeof STAGE2_DEMO.flawedParts)[number], { error: true }> =>
      Boolean('error' in p && p.error),
    )
    .map((p) => ({ id: p.id, text: p.text, correctType: p.correctType }));
}
