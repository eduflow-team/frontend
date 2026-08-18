import { UiTour, type UiTourStep } from '../common/UiTour';

export const STAGE1_STUDENT_TOUR_STEPS: UiTourStep[] = [
  {
    target: 's1-tour-mission',
    title: '문제 확인',
    body: '선생님이 낸 퀴즈 문제가 여기 있어요. 정답은 마감 전에 공개되지 않으니, 힌트를 모아 스스로 찾아야 합니다.',
    placement: 'right',
  },
  {
    target: 's1-tour-doc',
    title: '학습 자료',
    body: '선생님이 올린 PDF예요. 「보기」를 누르면 원본 화면으로 확인할 수 있어요.',
    placement: 'right',
  },
  {
    target: 's1-tour-params',
    title: '파라미터 조절',
    body: 'chunk_size · top_k · temperature를 바꿔 가며 AI 검색 방식을 실험해 보세요. 기본값보다 과하게 키우면 맞더라도 감점될 수 있어요.',
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
    body: '여기로 자유롭게 질문하세요. AI는 정답을 직접 말하지 않고 힌트만 줍니다.',
    placement: 'left',
  },
  {
    target: 's1-tour-submit',
    title: '내 답안 제출',
    body: '힌트와 참고 문장을 보고 답을 직접 입력해 제출하세요. 제출 기회는 2회예요.',
    placement: 'top',
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
