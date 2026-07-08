import { PageHero, PlaceholderCard } from '../../components/common';

interface TeacherSimplePageProps {
  title: string;
  description: string;
  cardTitle: string;
}

function TeacherSimplePage({ title, description, cardTitle }: TeacherSimplePageProps) {
  return (
    <>
      <PageHero title={title} description={description} />
      <PlaceholderCard title={cardTitle} />
    </>
  );
}

export function TeacherMaterialsPage() {
  return (
    <TeacherSimplePage
      title="자료 관리"
      description="교과 PDF, 참고 자료를 업로드하고 관리합니다."
      cardTitle="자료 목록 · 업로드"
    />
  );
}

export function TeacherStudentsPage() {
  return (
    <TeacherSimplePage
      title="학생 현황"
      description="학급별 제출 현황과 학습 진도를 확인합니다."
      cardTitle="학생 목록 · 제출 상태"
    />
  );
}

export function TeacherGradesPage() {
  return (
    <TeacherSimplePage
      title="성적 관리"
      description="단계별 점수와 평균을 관리합니다."
      cardTitle="성적표 · 통계"
    />
  );
}

export function TeacherAttendancePage() {
  return (
    <TeacherSimplePage
      title="출석 관리"
      description="수업 참여 및 출석 현황을 기록합니다."
      cardTitle="출석부"
    />
  );
}

export function TeacherNoticesPage() {
  return (
    <TeacherSimplePage
      title="공지사항"
      description="학급 공지를 작성하고 관리합니다."
      cardTitle="공지 목록"
    />
  );
}

export function TeacherMessagesPage() {
  return (
    <TeacherSimplePage
      title="메시지함"
      description="학생 및 학부모와의 메시지를 확인합니다."
      cardTitle="메시지 목록"
    />
  );
}
