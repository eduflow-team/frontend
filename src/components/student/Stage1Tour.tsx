import { UiTour, type UiTourStep } from '../common/UiTour';

export const STAGE1_STUDENT_TOUR_STEPS: UiTourStep[] = [
  {
    target: 's1-tour-mission',
    title: '문제 확인',
    body: '선생님이 낸 퀴즈 문제가 위에 보여요. 마감도 바로 아래에 있고, 정답은 마감 전에 공개되지 않으니 힌트를 모아 스스로 찾아야 합니다.',
    placement: 'bottom',
  },
  {
    target: 's1-tour-doc',
    title: '학습 자료',
    body: '문제 오른쪽 「학습 자료」 버튼을 누르면 선생님이 올린 PDF 원본을 볼 수 있어요.',
    placement: 'left',
  },
  {
    target: 's1-tour-params',
    title: '파라미터 조절',
    body: '왼쪽에서 chunk_size · top_k · temperature를 바꿔 가며 AI 검색 방식을 실험해 보세요. 기본값보다 과하게 키우면 맞더라도 감점될 수 있어요.',
    placement: 'right',
  },
  {
    target: 's1-tour-topk',
    title: 'top-k 자세히 보기',
    body: '질문을 보낸 뒤 이 버튼을 누르면, AI가 참고한 문장을 팝업으로 볼 수 있어요. top_k 숫자만큼 문장이 쌓입니다.',
    placement: 'right',
  },
  {
    target: 's1-tour-chat',
    title: 'AI와 대화로 힌트 받기',
    body: '오른쪽 채팅창으로 자유롭게 질문하세요. AI는 정답을 직접 말하지 않고 힌트만 줍니다.',
    placement: 'left',
  },
  {
    target: 's1-tour-submit',
    title: '내 답안 제출',
    body: '아래 제출칸에 답을 입력하세요. 맞으면 바로 최종 제출되고, 틀리면 한 번 더 기회가 있어요.',
    placement: 'top',
  },
];

export type Stage1HelpSection = {
  where: string;
  title: string;
  bullets: string[];
  tip?: string;
};

/** 화면 중간에도 다시 볼 수 있는 시나리오 1 도움말 */
export const STAGE1_HELP_INTRO =
  '퀴즈를 풀며 AI 검색 파라미터를 실험하는 단계예요. AI는 틀릴 수 있으니, 힌트를 모아 스스로 답을 제출하세요.';

export const STAGE1_HELP_SECTIONS: Stage1HelpSection[] = [
  {
    where: '위',
    title: '문제 · 학습 자료',
    bullets: [
      '퀴즈 문제와 마감이 위에 있어요',
      '「학습 자료」로 선생님이 올린 PDF를 볼 수 있어요',
      '정답은 마감 전에 공개되지 않아요',
    ],
  },
  {
    where: '왼쪽',
    title: '파라미터',
    bullets: [
      'chunk_size · top_k · temperature로 검색 방식을 바꿔요',
      '기본값보다 top_k·chunk를 과하게 키우면 감점될 수 있어요',
    ],
    tip: '맞더라도 자원을 많이 쓰면 점수가 깎여요. 최소한으로 조절해 보세요.',
  },
  {
    where: '왼쪽',
    title: 'top-k 자세히 보기',
    bullets: [
      '질문을 보낸 뒤 버튼을 누르면 AI가 참고한 문장이 보여요',
      'top_k 숫자만큼 문장이 쌓여요',
    ],
  },
  {
    where: '오른쪽',
    title: 'AI 채팅',
    bullets: ['자유롭게 질문해 힌트를 모으세요', 'AI는 정답을 직접 말하지 않아요'],
  },
  {
    where: '아래',
    title: '내 답안 제출',
    bullets: [
      '화면 아래 제출칸에 본인 답을 입력해요',
      '정답이면 바로 최종 제출·완료돼요',
      '오답이면 한 번 더 도전할 수 있어요',
      '두 번 모두 쓰면 점수가 더 높은 제출이 최종이에요',
    ],
  },
];

interface Stage1TourProps {
  open: boolean;
  onFinish: () => void;
}

export function Stage1Tour({ open, onFinish }: Stage1TourProps) {
  return (
    <UiTour
      open={open}
      steps={STAGE1_STUDENT_TOUR_STEPS}
      onFinish={onFinish}
      finishLabel="시작하기"
      ariaLabel="학생 화면 안내"
    />
  );
}
