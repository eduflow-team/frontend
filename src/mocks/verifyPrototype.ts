/**
 * stage2-ui verifyPrototype — UI 목업용 (API 연동 전)
 */
export const VERIFY_PROTOTYPE = {
  setBar: {
    title: '2단원 검증 세트',
    cardLabel: '2/5',
    meta: '이 카드 = 환각 1개 · 과제 1개',
  },
  modeTitle: '동아시아사 Hallucination 탐지',
  referenceExcerpt:
    '1876년 조일수호조규 체결 후 일본의 영향력이 확대되었다. 1894년 청일전쟁에서 일본이 승리한 뒤 러·청·일 삼국 간섭이 이루어졌다.',
  hint: '잘못된 문서 검색 · 페르소나 편향 · 정보 날조',
  pdfFilename: '동아시아사_교과자료.pdf',
  question: '개항 이후 동아시아 정세 변화를 교과 자료 범위에서 설명해 주세요.',
  aiPrefix: '개항 직후 ',
  errorSpanText: '서양 열강의 경제 침투가 본격화되었고',
  aiSuffix:
    ', 1876년 조일수호조규 체결로 일본의 영향력이 확대되었다. 이 조약은 조선이 외국과 맺은 첫 근대적 조약으로, 이후 조선의 대외 관계 전반에 큰 영향을 주었다. 1882년 이후 조선은 청과 일본 사이에서 복잡한 외교 관계에 놓이게 되었다. 1894년 청일전쟁에서 일본이 승리하면서 동아시아의 세력 균형이 크게 흔들렸다. 전쟁 직후 러시아·청·일본 세 나라의 이해관계가 얽히며 삼국 간섭이 이루어졌다. 이러한 과정을 거치며 조선을 둘러싼 국제 정세는 이전보다 훨씬 불안정해졌다.',
  correctErrorType: 'INFORMATION_FABRICATION' as const,
  hallucinationOptions: [
    {
      value: 'RETRIEVAL_ERROR',
      label: '잘못된 문서 검색',
      description: '무관한 청크를 참고하여 오류 발생',
    },
    {
      value: 'PERSONA_BIAS',
      label: '페르소나 편향',
      description: '잘못된 믿음을 가진 AI가 답변을 조작',
    },
    {
      value: 'INFORMATION_FABRICATION',
      label: '정보 날조',
      description: '교재에 없는 허위 사실을 생성',
    },
  ],
  defaultErrorType: 'RETRIEVAL_ERROR' as const,
  maxAttempts: 5,
  feedbackSuccess: {
    text: '위치·환각 유형·교과 근거가 적절합니다.',
    loc: 96,
    reason: 97,
    typeOk: true,
  },
  feedbackFail: {
    text: '환각 유형이 맞지 않습니다. 교과 근거 서술도 보완해 주세요.',
    loc: 88,
    reason: 62,
    typeOk: false,
  },
  correction: {
    label: '「서양 열강의 경제 침투가 본격화되었고」 수정 문장',
    defaultAnswer:
      '발췌문은 조·청·일 관계만 다루므로, 서양 열강 경제 침투를 단정할 근거가 없습니다.',
    resultTitle: '교정 결과 · 100점',
    resultText: '발췌 범위 밖 단정을 제거한 수정문입니다.',
  },
  done: {
    message: '이 카드는 완료되었습니다. 세트의 다음 카드로 이동하세요.',
  },
  reasonPlaceholder:
    '예: 발췌에는 서양 열강·경제 침투 언급이 없고, 조·청·일 관계만 다룹니다.',
};

export type VerifyPhase = 'find' | 'correct' | 'done';

export function matchesErrorSpan(selected: string, target: string) {
  const a = selected.trim();
  const b = target.trim();
  if (!a || a.length < 4) return false;
  return b.includes(a) || a.includes(b);
}

export function modeBadge(phase: VerifyPhase) {
  if (phase === 'correct') return '교정 단계';
  if (phase === 'done') return '완료';
  return '환각 1개 찾기';
}

export function verifyIntro(phase: VerifyPhase) {
  if (phase === 'find') {
    return '교과 자료와 다른 문장을 드래그하거나 클릭해 선택하세요.';
  }
  if (phase === 'correct') {
    return '찾은 오류를 교과 자료에 맞는 올바른 문장으로 고쳐 최종 제출하세요.';
  }
  return '이 과제의 환각 탐지와 교정이 모두 끝났습니다.';
}

export function flawedAiFullText() {
  return VERIFY_PROTOTYPE.aiPrefix + VERIFY_PROTOTYPE.errorSpanText + VERIFY_PROTOTYPE.aiSuffix;
}
