import { useParams } from 'react-router-dom';
import { PageHero, PlaceholderCard } from '../../components/common';

const STAGE_DESCRIPTIONS: Record<string, string> = {
  '1': 'Temperature, Chunk Size 등 AI 파라미터 과제를 출제합니다.',
  '2': 'AI 환각(Hallucination) 탐지 과제를 구성합니다.',
  '3': 'AI 관점 비교 토론 주제를 설정합니다.',
  '4': 'AI 보안 실습 시나리오를 배포합니다.',
};

export function TeacherStagePage() {
  const { stage } = useParams<{ stage: string }>();
  const stageNum = stage ?? '1';

  return (
    <>
      <PageHero
        title={`${stageNum}단계 과제 출제`}
        description={STAGE_DESCRIPTIONS[stageNum] ?? ''}
      />
      <PlaceholderCard title={`${stageNum}단계 과제 편집 영역`} />
    </>
  );
}
