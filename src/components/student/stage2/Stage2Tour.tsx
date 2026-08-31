import { UiTour, type UiTourStep } from '../../common/UiTour';

export const STAGE2_STUDENT_TOUR_STEPS: UiTourStep[] = [
  {
    target: 's2-tour-pdf',
    title: '교과 PDF',
    body: '교과 자료를 열어 AI 지문과 대조하세요.',
    placement: 'right',
  },
  {
    target: 's2-tour-ai',
    title: '지문에서 오류 찾기',
    body: '교과 자료와 다른 문장을 드래그하거나 클릭해 선택하세요.',
    placement: 'left',
  },
  {
    target: 's2-tour-type',
    title: '환각 유형',
    body: '페르소나 편향 · 정보 날조 · 잘못된 검색 중 해당 유형을 고릅니다.',
    placement: 'top',
  },
  {
    target: 's2-tour-reason',
    title: '교과 근거',
    body: '왜 틀렸는지, 교과 자료 근거와 함께 적어 주세요.',
    placement: 'top',
  },
  {
    target: 's2-tour-submit',
    title: '제출 및 피드백',
    body: '제출하면 위치·유형·근거를 채점해 줍니다. 맞히면 교정 단계로 넘어갑니다.',
    placement: 'top',
  },
  {
    target: 's2-tour-rubric',
    title: '채점 기준',
    body: '근거 인용 · 오류 식별 · 재서술 세 가지를 확인할 수 있어요. 시도 횟수는 상단에서 봅니다.',
    placement: 'right',
  },
];

export const STAGE2_CORRECTION_TOUR_STEPS: UiTourStep[] = [
  {
    target: 's2-tour-correction-intro',
    title: '교정 단계',
    body: '환각 구간 찾기는 끝났어요. 이제 틀린 문장을 교과 PDF에 맞게 고칩니다.',
    placement: 'left',
  },
  {
    target: 's2-tour-correction-warning',
    title: '1회만 제출',
    body: '교정은 최종 1회만 제출할 수 있어요. PDF와 대조해 신중하게 작성하세요.',
    placement: 'top',
  },
  {
    target: 's2-tour-correction-input',
    title: '수정 문장 작성',
    body: '하이라이트된 틀린 문장마다, PDF에 맞는 올바른 문장을 입력합니다.',
    placement: 'top',
  },
  {
    target: 's2-tour-correction-submit',
    title: '교정 제출 · 재서술',
    body: '모든 수정 문장을 작성한 뒤 제출하세요. 「재서술」 루브릭에서 교정 결과를 확인합니다.',
    placement: 'top',
  },
];

export function filterStage2FindTourSteps(
  steps: UiTourStep[],
  canOpenPdf: boolean,
  showFindForm: boolean,
): UiTourStep[] {
  let next = steps;
  if (!canOpenPdf) {
    next = next.filter((s) => s.target !== 's2-tour-pdf');
  }
  if (!showFindForm) {
    next = next.filter(
      (s) => !['s2-tour-type', 's2-tour-reason', 's2-tour-submit'].includes(s.target),
    );
  }
  return next;
}

export function filterStage2CorrectionTourSteps(steps: UiTourStep[]): UiTourStep[] {
  return steps;
}

interface Stage2TourProps {
  open: boolean;
  onFinish: () => void;
  steps?: UiTourStep[];
}

export function Stage2Tour({ open, onFinish, steps = STAGE2_STUDENT_TOUR_STEPS }: Stage2TourProps) {
  return (
    <UiTour
      open={open}
      steps={steps}
      onFinish={onFinish}
      finishLabel="시작하기"
      ariaLabel="Hallucination 탐지 화면 안내"
    />
  );
}
