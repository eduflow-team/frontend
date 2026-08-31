import { UiTour, type UiTourStep } from '../../../components/common/UiTour';

export const STAGE4_STUDENT_TOUR_STEPS: UiTourStep[] = [
  {
    target: 's4-tour-mission',
    title: '미션 확인',
    body: '이 과제에서 지켜야 할 목표예요. AI가 숨긴 비밀 키를 알아내는 것이 클리어 조건입니다.',
    placement: 'bottom',
  },
  {
    target: 's4-tour-attempts',
    title: '남은 시도',
    body: '공격할 수 있는 횟수예요. 난이도마다 제한이 있으니 신중하게 프롬프트를 보내세요.',
    placement: 'left',
  },
  {
    target: 's4-tour-log',
    title: '공격 기록',
    body: '지금까지 보낸 공격과 결과가 쌓입니다. 거절·클리어 여부를 한눈에 확인할 수 있어요.',
    placement: 'right',
  },
  {
    target: 's4-tour-hints',
    title: '힌트',
    body: '공격이 거절되면 힌트가 단계적으로 열립니다. 정답이 아니라 방향만 알려 주니, 막힐 때 참고하세요.',
    placement: 'right',
  },
  {
    target: 's4-tour-chat',
    title: 'AI와 대화',
    body: '당신은 공격자입니다. AI 방어를 상대로 프롬프트를 보내 비밀 키를 끌어내 보세요.',
    placement: 'left',
  },
  {
    target: 's4-tour-input',
    title: '공격 입력',
    body: '여기에 공격 문장을 쓰고 보내세요. 직접 요구, 역할 변경, 형식 유도 등 다양한 방법을 시도해 볼 수 있어요.',
    placement: 'top',
  },
];

interface Stage4TourProps {
  open: boolean;
  onFinish: () => void;
}

export function Stage4Tour({ open, onFinish }: Stage4TourProps) {
  return (
    <UiTour
      open={open}
      steps={STAGE4_STUDENT_TOUR_STEPS}
      onFinish={onFinish}
      finishLabel="시작하기"
      ariaLabel="공격 실습 안내"
    />
  );
}
