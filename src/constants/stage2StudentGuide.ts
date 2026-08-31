export const SHOW_STAGE2_EXCERPT_PANEL = false;

export const HALLUCINATION_TYPE_GUIDE = [
  {
    value: 'PERSONA_BIAS',
    label: '페르소나 편향',
    short: 'AI 역할·믿음 때문에 왜곡',
    summary: '선생님이 준 AI 페르소나(성격·관점) 때문에 사실이 한쪽으로 기울어진 경우입니다.',
    example: '「청과의 교역은 항상 평화로웠다」처럼 특정 국가·사건을 과하게 미화',
  },
  {
    value: 'INFORMATION_FABRICATION',
    label: '정보 날조',
    short: '교과에 없는 내용을 지어냄',
    summary: 'PDF·교과 어디에도 없는 사실·수치·인물을 새로 만들어 낸 경우입니다.',
    example: '교과서에 없는 전투·조약·발명을 사실처럼 서술',
  },
  {
    value: 'RETRIEVAL_ERROR',
    label: '잘못된 문서 검색',
    short: '문서 내용을 엉뚱하게 연결',
    summary: '교과 자료 안의 정보는 맞지만, 다른 대상·시기·맥락에 잘못 붙인 경우입니다.',
    example: 'A 기구의 기능을 B 기구 설명에 붙여 쓴 경우',
  },
] as const;
