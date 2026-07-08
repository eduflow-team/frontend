import { Link } from 'react-router-dom';
import { PageHero, PlaceholderCard } from '../../components/common';
import { STUDENT_SUBJECTS } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';

export function StudentDashboardPage() {
  const { user } = useAuth();
  const histActivities = STUDENT_SUBJECTS[0].activities;

  return (
    <>
      <PageHero
        title={`안녕하세요, ${user?.name ?? '학생'}님`}
        description="한국사 · AI 리터러시 학습 현황"
      />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">진행 중인 활동</span>
        </div>
        <div className="card-body">
          {histActivities.slice(0, 2).map((activity) => (
            <div
              key={activity.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{activity.title}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                  한국사 · {activity.stage}단계
                </div>
              </div>
              <Link to={activity.path} className="btn btn-primary btn-sm">
                {activity.stage === 1 ? '이어하기' : '시작'}
              </Link>
            </div>
          ))}
        </div>
      </div>
      <PlaceholderCard title="점수 · 출석 요약" />
    </>
  );
}
