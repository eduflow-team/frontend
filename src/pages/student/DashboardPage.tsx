import { Link } from 'react-router-dom';
import {
  fetchStudentDashboardAssignmentsApi,
  fetchStudentDashboardSummaryApi,
} from '../../api';
import { ApiStateBody, PageHero, PlaceholderCard } from '../../components/common';
import { STUDENT_SUBJECTS } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { formatDueAt } from '../../utils/datetime';
import { PROGRESS_LABELS } from '../../utils/labels';

export function StudentDashboardPage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const histActivities = STUDENT_SUBJECTS[0].activities;

  const summary = useFetch(fetchStudentDashboardSummaryApi, [], Boolean(useApi));
  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], Boolean(useApi));

  if (!useApi) {
    return (
      <>
        <PageHero
          title={`안녕하세요, ${user?.name ?? '학생'}님`}
          description="한국사 · AI 리터러시 학습 현황 (데모)"
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

  return (
    <>
      <PageHero
        title={`안녕하세요, ${summary.data?.student_name ?? user?.name ?? '학생'}님`}
        description="AI 리터러시 학습 현황"
      />

      {summary.loading || summary.error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <ApiStateBody loading={summary.loading} error={summary.error} isEmpty={false}>
              <span />
            </ApiStateBody>
          </div>
        </div>
      ) : (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>총점</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
              {summary.data?.total_score ?? 0}점
            </div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>출석률</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
              {Math.round(summary.data?.attendance_rate ?? 0)}%
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">단계별 진행</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={summary.loading}
              error={summary.error}
              isEmpty={!summary.data?.stage_summary.length}
            >
              {summary.data?.stage_summary.map((item) => (
                <div
                  key={item.stage}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 14,
                  }}
                >
                  <span>{item.stage}단계</span>
                  <span>
                    {PROGRESS_LABELS[item.status]}
                    {item.score != null ? ` · ${item.score}점` : ''}
                  </span>
                </div>
              ))}
            </ApiStateBody>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">과제 목록</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={assignments.loading}
              error={assignments.error}
              isEmpty={!assignments.data?.assignments.length}
              emptyMessage="배정된 과제가 없습니다."
            >
              {assignments.data?.assignments.map((item) => {
                const stage = item.stage ?? 1;
                const path =
                  stage >= 1 && stage <= 4
                    ? `/student/hist/stage/${stage}?assignmentId=${item.assignment_id}`
                    : `/student/hist/stage/1?assignmentId=${item.assignment_id}`;
                return (
                  <div
                    key={item.assignment_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {item.title ?? `과제 #${item.assignment_id}`}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                        {item.stage != null ? `${item.stage}단계 · ` : ''}
                        {PROGRESS_LABELS[item.status]}
                        {item.due_date ? ` · 마감 ${formatDueAt(item.due_date)}` : ''}
                      </div>
                    </div>
                    <Link to={path} className="btn btn-primary btn-sm">
                      열기
                    </Link>
                  </div>
                );
              })}
            </ApiStateBody>
          </div>
        </div>
      </div>
    </>
  );
}
