export interface StageGuideStep {
  title: string;
  body: string;
}

export interface StageGuide {
  /** 문장 중 강조할 단어. intro에 {highlight} 자리표시자 사용 */
  intro: string;
  highlight: string;
  steps: StageGuideStep[];
  calloutTitle: string;
  calloutBody: string;
  hint?: string;
  cta: string;
}

export const STAGE_GUIDES: Record<number, StageGuide> = {
  1: {
    intro:
      '여러분은 AI가 자료를 읽고 답하는 과정을 실험하는 {highlight}입니다. 파라미터를 바꿔 보며 AI 동작 원리를 이해합니다.',
    highlight: '탐험가',
    steps: [
      {
        title: '자료와 질문을 확인합니다',
        body: '선생님이 올린 문서와 질문을 보고, AI가 어떤 답을 내는지 관찰합니다.',
      },
      {
        title: '파라미터를 조절해 실험합니다',
        body: '청크 크기·Top-K·온도를 바꿔 가며 답변 품질이 어떻게 달라지는지 비교합니다.',
      },
      {
        title: '가장 좋은 설정을 제출합니다',
        body: '실험 결과를 바탕으로 최선이라고 생각하는 파라미터를 고르고 제출합니다.',
      },
    ],
    calloutTitle: '포인트',
    calloutBody:
      '정답을 맞히는 활동이 아닙니다. AI가 왜 그렇게 답했는지 구조를 이해하는 것이 목표입니다.',
    cta: '과제 고르러 가기',
  },
  2: {
    intro:
      '여러분은 AI 답변 속 오류를 찾아내는 {highlight}입니다. 환각(Hallucination)을 탐지하고 Fact-check합니다.',
    highlight: '검증자',
    steps: [
      {
        title: '원문과 AI 답변을 비교합니다',
        body: '참고 문서와 AI가 쓴 답을 나란히 보고, 사실과 다른 문장을 찾습니다.',
      },
      {
        title: '오류 문장을 표시하고 유형을 고릅니다',
        body: '틀린 부분을 하이라이트한 뒤, 어떤 종류의 환각인지 분류합니다.',
      },
      {
        title: '검증 결과를 제출합니다',
        body: '찾은 오류와 유형을 바탕으로 Hallucination 탐지를 마무리합니다.',
      },
    ],
    calloutTitle: '포인트',
    calloutBody: 'AI 답을 그대로 믿지 말고, 근거 문서와 대조해 스스로 확인하는 습관을 기릅니다.',
    cta: '과제 고르러 가기',
  },
  3: {
    intro: '여러분은 토론에 참가하는 {highlight}입니다. 찬성·반대를 고르는 활동이 아닙니다.',
    highlight: '평가자',
    steps: [
      {
        title: '두 AI가 번갈아 발언합니다',
        body: '찬성 측과 반대 측이 한 번씩 주고받으며 근거를 제시합니다.',
      },
      {
        title: '발언마다 검증할지 정합니다',
        body: '근거가 과장됐거나 사실과 달라 보이면 팩트체커에게 검증을 요청하고, 믿을 만하면 넘어갑니다.',
      },
      {
        title: '팩트체커 사용 능력으로 점수가 매겨집니다',
        body: '누가 토론에서 이겼는지는 채점하지 않습니다. 의심할 순간에 AI를 썼는지를 봅니다.',
      },
    ],
    calloutTitle: '감점되는 경우',
    calloutBody:
      '과장·허위 근거인데 검증하지 않고 넘어갔을 때, 반대로 근거가 탄탄한 발언까지 검증했을 때. 검증에도 비용이 든다는 점을 기억하세요.',
    hint: '시작을 누르면 찬성·반대·팩트체커 AI가 토론을 준비합니다. 약 15초 걸릴 수 있습니다.',
    cta: '과제 고르러 가기',
  },
  4: {
    intro: '여러분은 키를 빼내는 쪽이 아닙니다. {highlight}입니다.',
    highlight: '숨겨진 키를 지키는 문지기',
    steps: [
      {
        title: 'AI가 먼저 프롬프트를 남깁니다',
        body: '직접 묻거나, 역할을 바꾸거나, 형식을 바꿔 키를 유도합니다.',
      },
      {
        title: '문지기로서 답합니다',
        body: '키·키의 조각·거꾸로 쓴 키를 답에 넣으면 유출로 판정됩니다.',
      },
      {
        title: 'EASY를 막으면 다음 난이도가 열립니다',
        body: 'NORMAL, HARD 순으로 공격이 교묘해집니다. 막힌 뒤에는 보고서를 씁니다.',
      },
    ],
    calloutTitle: '채점',
    calloutBody: '키를 지킨 비율과 보고서가 중심입니다. 힌트 카드는 쓸 수 있지만 감점됩니다.',
    cta: '과제 고르러 가기',
  },
};
