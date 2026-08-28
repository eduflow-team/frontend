import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ApiError,
  deleteTeacherAssignmentApi,
  fetchTeacherDashboardAssignmentsApi,
  fetchTeacherDashboardSummaryApi,
  fetchTeacherUnsubmittedApi,
} from '../../api';
import { ApiStateBody, PageHero } from '../../components/common';
import {
  STUDENT_LEARNING_MODES,
  learningModeLabel,
  learningModeLabels,
} from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

const ASSIGN_SHORTCUTS = STUDENT_LEARNING_MODES.map((mode) => ({
  stage: mode.stage,
  title: mode.module,
  desc: mode.content,
  icon: mode.icon,
  path: `/teacher/stage/${mode.stage}`,
}));

function AssignShortcuts() {
  return (
    <section className="t-home-section">
      <div className="t-home-section-head">
        <h2 className="t-home-section-title">과제 출제</h2>
        <p className="t-home-section-desc">학습 모드를 골라 바로 과제를 만듭니다.</p>
      </div>
      <div className="t-home-assign-grid">
        {ASSIGN_SHORTCUTS.map((item) => (
          <Link key={item.stage} to={item.path} className="t-home-assign-card">
            <span className="t-home-assign-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="t-home-assign-title">{item.title}</span>
            <span className="t-home-assign-desc">{item.desc}</span>
            <span className="t-home-assign-cta">과제 만들기 →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TeacherDashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const useApi = user && !user.isDemo;
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [flashToast, setFlashToast] = useState('');

  useEffect(() => {
    const state = location.state as { flashSuccess?: string } | null;
    const msg = state?.flashSuccess?.trim();
    if (!msg) return;
    setFlashToast(msg);
    setReloadKey((k) => k + 1);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!flashToast) return;
    const t = window.setTimeout(() => setFlashToast(''), 2800);
    return () => window.clearTimeout(t);
  }, [flashToast]);

  const summary = useFetch(fetchTeacherDashboardSummaryApi, [reloadKey], Boolean(useApi));
  const unsubmitted = useFetch(fetchTeacherUnsubmittedApi, [reloadKey], Boolean(useApi));
  const assignments = useFetch(fetchTeacherDashboardAssignmentsApi, [reloadKey], Boolean(useApi));

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

  const flash = (
    <div
      className={`app-flash-toast${flashToast ? ' show' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="app-flash-toast-check" aria-hidden>
        ✓
      </span>
      <span>{flashToast || '완료'}</span>
    </div>
  );

  if (!useApi) {
    return (
      <div className="t-home">
        {flash}
        <PageHero
          title={`안녕하세요, ${user?.name ?? '선생님'} 선생님`}
          description="한국사 교과 · 전체 학급 AI 리터러시 활동 현황 (데모)"
        />

        <AssignShortcuts />

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-label">전체 학생</div>
            <div className="stat-card-value">84명</div>
          </div>
          <Link to="/teacher/students" className="stat-card stat-card-link">
            <div className="stat-card-label">미제출</div>
            <div className="stat-card-value">12명</div>
            <div className="stat-card-hint">학생 현황에서 보기 →</div>
          </Link>
          <div className="stat-card">
            <div className="stat-card-label">학급 평균 점수</div>
            <div className="stat-card-value">78점</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">학습 모드별 제출률</span>
            </div>
            <div className="card-body">
              {ASSIGN_SHORTCUTS.map((mode) => (
                <div key={mode.stage} className="t-home-row">
                  <span>{mode.title}</span>
                  <span className="t-home-row-meta">데모</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header t-home-card-head">
              <span className="card-title">미제출 학생</span>
              <Link to="/teacher/students" className="t-home-card-link">
                학생 현황 →
              </Link>
            </div>
            <div className="card-body">
              <Link to="/teacher/students" className="t-home-unsubmitted-link">
                <div className="t-home-row">
                  <div>
                    <div className="t-home-row-title">김지원 외 11명</div>
                    <div className="t-home-row-meta">미완료 학습 모드를 학생 현황에서 확인하세요</div>
                  </div>
                  <span className="t-home-row-arrow" aria-hidden>
                    →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="t-home">
      {flash}
      <PageHero
        title={`안녕하세요, ${user?.name ?? '선생님'} 선생님`}
        description="전체 학급 AI 리터러시 활동 현황"
      />

      <AssignShortcuts />

      {summary.loading || summary.error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <ApiStateBody loading={summary.loading} error={summary.error} isEmpty={false}>
              <span />
            </ApiStateBody>
          </div>
        </div>
      ) : (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-label">전체 학생</div>
            <div className="stat-card-value">{summary.data?.total_students ?? 0}명</div>
          </div>
          <Link to="/teacher/students" className="stat-card stat-card-link">
            <div className="stat-card-label">미제출</div>
            <div className="stat-card-value">{summary.data?.unsubmitted_count ?? 0}명</div>
            <div className="stat-card-hint">학생 현황에서 보기 →</div>
          </Link>
          <div className="stat-card">
            <div className="stat-card-label">학급 평균 점수</div>
            <div className="stat-card-value">{summary.data?.class_average_score ?? 0}점</div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">학습 모드별 제출률</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={summary.loading}
              error={summary.error}
              isEmpty={!summary.data?.stage_submission_rates.length}
            >
              {summary.data?.stage_submission_rates.map((item) => (
                <div key={item.stage} className="t-home-row">
                  <span>{learningModeLabel(item.stage)}</span>
                  <span className="t-home-row-meta">
                    {item.submitted_count}명 · {Math.round(item.submission_rate)}%
                  </span>
                </div>
              ))}
            </ApiStateBody>
          </div>
        </div>

        <div className="card">
          <div className="card-header t-home-card-head">
            <span className="card-title">미제출 학생</span>
            <Link to="/teacher/students" className="t-home-card-link">
              학생 현황 →
            </Link>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={unsubmitted.loading}
              error={unsubmitted.error}
              isEmpty={!unsubmitted.data?.unsubmitted_students.length}
              emptyMessage="미제출 학생이 없습니다."
            >
              {unsubmitted.data?.unsubmitted_students.map((student) => (
                <Link
                  key={student.student_id}
                  to={`/teacher/students/${student.student_id}`}
                  className="t-home-unsubmitted-link"
                >
                  <div className="t-home-row">
                    <div>
                      <div className="t-home-row-title">{student.student_name}</div>
                      <div className="t-home-row-meta">
                        미완료: {learningModeLabels(student.missing_stage)}
                      </div>
                    </div>
                    <span className="t-home-row-arrow" aria-hidden>
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </ApiStateBody>
          </div>
        </div>
      </div>

      <div className="card t-home-assignments-card" style={{ marginTop: 16 }}>
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
            <div className="t-home-assignments-list">
              {assignments.data?.assignments.map((item) => (
                <div key={item.assignment_id} className="t-home-row t-home-row-assign">
                <div>
                  <div className="t-home-row-title">
                    {item.title ?? `과제 #${item.assignment_id}`}
                  </div>
                  <div className="t-home-row-meta">
                    {item.stage != null ? learningModeLabel(item.stage) : ''}
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
            </div>
          </ApiStateBody>
          {actionError && <p className="inline-alert error">{actionError}</p>}
        </div>
      </div>
    </div>
  );
}
