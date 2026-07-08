import { PageHero, PlaceholderCard } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

export function TeacherDashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHero
        title={`안녕하세요, ${user?.name ?? '선생님'} 선생님`}
        description="한국사 교과 · 전체 학급 AI 리터러시 활동 현황"
      />
      <PlaceholderCard title="공지사항 · 통계 · 단계별 제출 현황" />
    </>
  );
}
