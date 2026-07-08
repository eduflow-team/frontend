import { Navigate, useParams } from 'react-router-dom';
import { PageHero, PlaceholderCard } from '../../components/common';
import { STAGE_TITLES, STUDENT_SUBJECTS } from '../../constants/navigation';
import type { SubjectKey } from '../../types';

export function StudentStagePage() {
  const { subject, stage } = useParams<{ subject: SubjectKey; stage: string }>();
  const subjectData = STUDENT_SUBJECTS.find((s) => s.key === subject);
  const stageNum = Number(stage);
  const activity = subjectData?.activities.find((a) => a.stage === stageNum);

  if (!subjectData || !activity || Number.isNaN(stageNum) || stageNum < 1 || stageNum > 4) {
    return <Navigate to="/student" replace />;
  }

  return (
    <>
      <PageHero
        title={activity.title}
        description={`${subjectData.name} · ${STAGE_TITLES[stageNum]}`}
      />
      <PlaceholderCard title={`${stageNum}단계 학습 활동 UI`} />
    </>
  );
}

export function StudentResultsPage() {
  return (
    <>
      <PageHero title="점수" description="과목별 · 단계별 점수를 확인합니다." />
      <PlaceholderCard title="점수표" />
    </>
  );
}

export function StudentAttendancePage() {
  return (
    <>
      <PageHero title="출석" description="수업 참여 기록을 확인합니다." />
      <PlaceholderCard title="출석 현황" />
    </>
  );
}

export function StudentNoticesPage() {
  return (
    <>
      <PageHero title="공지사항" description="선생님이 등록한 공지를 확인합니다." />
      <PlaceholderCard title="공지 목록" />
    </>
  );
}
