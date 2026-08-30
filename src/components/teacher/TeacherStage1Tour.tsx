import { UiTour, type UiTourStep } from '../common/UiTour';

export const STAGE1_TEACHER_TOUR_STEPS: UiTourStep[] = [
  {
    target: 't1-tour-class',
    title: '학급 · 교과',
    body: '과제를 받을 학급과 교과를 고르세요.',
    placement: 'bottom',
  },
  {
    target: 't1-tour-question',
    title: '문제',
    body: '학생이 근거를 모아 정리할 서술형 문제 1개를 입력하세요. 예: “일제강점기 일본이 한국에 한 행동 3가지를 적으시오.”',
    placement: 'bottom',
  },
  {
    target: 't1-tour-answer',
    title: '정답 키포인트',
    body: '채점용 핵심 요점 3개를 적어 주세요. 학생 답안에 이 요점이 포함됐는지로 부분 점수가 나갑니다. 마감 전에 학생에게는 보이지 않습니다.',
    placement: 'bottom',
  },
  {
    target: 't1-tour-due',
    title: '마감일',
    body: '제출 마감을 정하세요. 마감 후에만 정답 키포인트가 공개됩니다.',
    placement: 'bottom',
  },
  {
    target: 't1-tour-file',
    title: '학습 문서',
    body: '수업 자료 PDF(또는 txt/md)를 끌어다 놓거나 클릭해서 올리세요. 학생이 AI와 탐색할 원문입니다.',
    placement: 'bottom',
  },
  {
    target: 't1-tour-submit',
    title: '과제 만들기',
    body: '다 채웠으면 여기서 게시합니다. 문서 임베딩에 잠시 시간이 걸릴 수 있어요.',
    placement: 'top',
  },
];

interface TeacherStage1TourProps {
  open: boolean;
  onFinish: () => void;
}

export function TeacherStage1Tour({ open, onFinish }: TeacherStage1TourProps) {
  return (
    <UiTour
      open={open}
      steps={STAGE1_TEACHER_TOUR_STEPS}
      onFinish={onFinish}
      finishLabel="작성 시작"
      ariaLabel="선생님 과제 만들기 안내"
    />
  );
}
