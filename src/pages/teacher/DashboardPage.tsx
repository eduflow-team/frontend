import { useState } from 'react';
import {
  ApiError,
  deleteTeacherAssignmentApi,
  fetchTeacherDashboardAssignmentsApi,
  fetchTeacherDashboardSummaryApi,
  fetchTeacherUnsubmittedApi,
} from '../../api';
import { ApiStateBody, PageHero, PlaceholderCard } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

export function TeacherDashboardPage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const summary = useFetch(fetchTeacherDashboardSummaryApi, [reloadKey], Boolean(useApi));
  const unsubmitted = useFetch(fetchTeacherUnsubmittedApi, [reloadKey], Boolean(useApi));
  const assignments = useFetch(fetchTeacherDashboardAssignmentsApi, [reloadKey], Boolean(useApi));

  if (!useApi) {
    return (
      <>
        <PageHero
          title={`안녕하세요, ${user?.name ?? '선생님'} 선생님`}
          description="한국사 교과 · 전체 학급 AI 리터러시 활동 현황 (데모)"
        />
        <PlaceholderCard title="공지사항 · 통계 · 단계별 제출 현황" />
      </>
    );
  }

  const handleDelete = async (assignmentId: number) => {
    if (!window.confirm('이 과제를 삭제할까요?')) return;
    setDeletingId(assignmentId);
    setActionError('');
    try {
      await deleteTeacherAssignmentApi(assignmentId);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHero
        title={`안녕하세요, ${user?.name ?? '선생님'} 선생님`}
        description="전체 학급 AI 리터러시 활동 현황"
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
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>전체 학생</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
              {summary.data?.total_students ?? 0}명
            </div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>미제출</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
              {summary.data?.unsubmitted_count ?? 0}명
            </div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>학급 평균 점수</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
              {summary.data?.class_average_score ?? 0}점
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">단계별 제출률</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={summary.loading}
              error={summary.error}
              isEmpty={!summary.data?.stage_submission_rates.length}
            >
              {summary.data?.stage_submission_rates.map((item) => (
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
                    {item.submitted_count}명 · {Math.round(item.submission_rate)}%
                  </span>
                </div>
              ))}
            </ApiStateBody>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">미제출 학생</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={unsubmitted.loading}
              error={unsubmitted.error}
              isEmpty={!unsubmitted.data?.unsubmitted_students.length}
              emptyMessage="미제출 학생이 없습니다."
            >
              {unsubmitted.data?.unsubmitted_students.map((student) => (
                <div
                  key={student.student_id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{student.student_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                    미완료: {student.missing_stage.join(', ')}단계
                  </div>
                </div>
              ))}
            </ApiStateBody>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">등록된 과제</span>
        </div>
        <div className="card-body">
          <ApiStateBody
            loading={assignments.loading}
            error={assignments.error}
            isEmpty={!assignments.data?.assignments.length}
            emptyMessage="등록된 과제가 없습니다."
          >
            {assignments.data?.assignments.map((item) => (
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
                  <div>{item.title ?? `과제 #${item.assignment_id}`}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                    {item.stage != null ? `${item.stage}단계` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--negative)' }}
                  disabled={deletingId === item.assignment_id}
                  onClick={() => handleDelete(item.assignment_id)}
                >
                  삭제
                </button>
              </div>
            ))}
          </ApiStateBody>
          {actionError && <p className="inline-alert error">{actionError}</p>}
        </div>
      </div>
    </>
  );
}
