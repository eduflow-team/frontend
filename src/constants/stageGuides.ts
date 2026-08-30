export interface StageGuideStep {
  title: string;
  body: string;
}

/** 한 장의 안내 팝업(순서 설명용) */
export interface StageGuidePage {
  title: string;
  intro?: string;
  highlight?: string;
  /** intro 없이 본문만 쓸 때 */
  body?: string;
  steps?: StageGuideStep[];
  calloutTitle?: string;
  calloutBody?: string;
  hint?: string;
}

export interface StageGuide {
  pages: StageGuidePage[];
  /** 마지막 페이지 CTA */
  cta: string;
}

export const STAGE_GUIDES: Record<number, StageGuide> = {
  1: {
    pages: [
      {
        title: 'RAG 탐험 시작',
        intro:
          '선생님이 수업 내용으로 서술형 문제를 내셨어요. 여러분은 핵심 요점을 정리해 {highlight}해야 합니다.',
        highlight: '답안을 제출',
        body: 'AI는 항상 맞는 답을 주지 않아요. 파라미터를 바꿔 힌트를 모은 뒤, 핵심 요점 3가지를 짧게 정리해 제출해 보세요.',
        calloutTitle: '주의',
        calloutBody:
          '파라미터를 너무 좋게(검색을 과하게) 올려 버리면 맞더라도 감점될 수 있어요. 최소한으로 조절하며 탐험해 보세요.',
      },
    ],
    cta: '과제 고르러 가기',
  },
  2: {
    pages: [
      {
        title: '이 활동은 이렇게 진행돼요',
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
        calloutBody:
          'AI 답을 그대로 믿지 말고, 근거 문서와 대조해 스스로 확인하는 습관을 기릅니다.',
      },
    ],
    cta: '과제 고르러 가기',
  },
  3: {
    pages: [
      {
        title: '이 활동은 이렇게 진행돼요',
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
      },
    ],
    cta: '과제 고르러 가기',
  },
  4: {
    pages: [
      {
        title: '이 활동은 이렇게 진행돼요',
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
      },
    ],
    cta: '과제 고르러 가기',
  },
};
