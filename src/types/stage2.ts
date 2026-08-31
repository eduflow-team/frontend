export type VerifyPhase = 'find' | 'correct' | 'done';

export function verifyIntro(phase: VerifyPhase) {
  if (phase === 'find') {
    return '교과 자료와 다른 문장을 드래그하거나 클릭해 선택하세요.';
  }
  if (phase === 'correct') {
    return '찾은 오류를 교과 자료에 맞는 올바른 문장으로 고쳐 최종 제출하세요.';
  }
  return '이 과제의 환각 탐지와 교정이 모두 끝났습니다.';
}
