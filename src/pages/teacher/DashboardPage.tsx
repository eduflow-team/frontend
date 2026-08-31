import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ApiError,
  deleteTeacherAssignmentApi,
  fetchTeacherDashboardAssignmentsApi,
  fetchTeacherDashboardSummaryApi,
  fetchTeacherUnsubmittedApi,
} from '../../api';
import type { TeacherAssignmentItem } from '../../api/types';
import { ApiStateBody, PageHero } from '../../components/common';
import {
  SUBJECT_OPTIONS,
  normalizeSubjectKey,
  subjectLabel,
  type SubjectValue,
} from '../../constants/assignments';
import {
  STUDENT_LEARNING_MODES,
  learningModeLabel,
  learningModeLabels,
  subjectPageTitle,
} from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

function assignmentSubjectKey(item: TeacherAssignmentItem): SubjectValue {
  return normalizeSubjectKey(item.subject);
}

function teacherSubjectKey(user: { subject?: string | null } | null | undefined): SubjectValue {
  if (!user?.subject) return 'hist';
  const byLabel = SUBJECT_OPTIONS.find((subject) => subject.label === user.subject);
  if (byLabel) return byLabel.value;
  return normalizeSubjectKey(user.subject);
}

function AssignShortcuts({
  subjectKey,
  onHome = false,
}: {
  subjectKey: SubjectValue;
  onHome?: boolean;
}) {
  const subjectName = subjectPageTitle(subjectKey);
  return (
    <section className="t-home-section">
      <div className="t-home-section-head">
        <h2 className="t-home-section-title">
          {onHome ? '과제 만들기' : `${subjectName} · 과제 만들기`}
        </h2>
        <p className="t-home-section-desc">
          {onHome
            ? '학습 모드를 골라 바로 과제를 출제합니다.'
            : `학습 모드를 골라 ${subjectName} 과제를 만듭니다.`}
        </p>
      </div>
      <div className="t-home-assign-grid">
        {STUDENT_LEARNING_MODES.map((mode) => (
          <Link
            key={mode.stage}
            to={`/teacher/stage/${mode.stage}?subject=${subjectKey}`}
            className="t-home-assign-card"
          >
            <span className="t-home-assign-icon" aria-hidden>
              {mode.icon}
            </span>
            <span className="t-home-assign-title">{mode.module}</span>
            <span className="t-home-assign-desc">{mode.content}</span>
            <span className="t-home-assign-cta">과제 만들기 →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AssignmentRows({
  items,
  deletingId,
  onDelete,
}: {
  items: TeacherAssignmentItem[];
  deletingId: number | null;
  onDelete: (id: number) => void;
}) {
  if (!items.length) {
    return <p className="hint">등록된 과제가 없습니다.</p>;
  }

  return (
    <div className="t-home-assignments-list">
      {items.map((item) => (
        <div key={item.assignment_id} className="t-home-row t-home-row-assign">
          <div>
            <div className="t-home-row-title">{item.title ?? `과제 #${item.assignment_id}`}</div>
            <div className="t-home-row-meta">
              {subjectLabel(item.subject)}
              {item.stage != null ? ` · ${learningModeLabel(item.stage)}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--negative)' }}
            disabled={deletingId === item.assignment_id}
            onClick={() => onDelete(item.assignment_id)}
          >
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}

export function TeacherDashboardPage() {
  const { subject: subjectParam } = useParams<{ subject?: string }>();
  const activeSubject = subjectParam ? normalizeSubjectKey(subjectParam) : null;
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const useApi = Boolean(user);
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

  const allAssignments = assignments.data?.assignments ?? [];
  const visibleAssignments = useMemo(() => {
    if (!activeSubject) return allAssignments;
    return allAssignments.filter((item) => assignmentSubjectKey(item) === activeSubject);
  }, [activeSubject, allAssignments]);

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
    <div className={`app-flash-toast${flashToast ? ' show' : ''}`} role="status" aria-live="polite">
      <span className="app-flash-toast-check" aria-hidden>
        ✓
      </span>
      <span>{flashToast || '완료'}</span>
    </div>
  );

  const heroTitle = activeSubject
    ? `${subjectPageTitle(activeSubject)}`
    : `안녕하세요, ${user?.name ?? '선생님'} 선생님`;
  const heroDesc = activeSubject
    ? `${subjectPageTitle(activeSubject)} 과제를 확인하고 새 과제를 만들 수 있습니다.`
    : '전체 학급 과제와 학습 현황을 한눈에 확인하세요.';

  const assignmentsCard = (
    <div className="card t-home-assignments-card" style={{ marginTop: activeSubject ? 0 : 16 }}>
      <div className="card-header">
        <span className="card-title">{activeSubject ? '등록된 과제' : '전체 과제'}</span>
      </div>
      <div className="card-body">
        <ApiStateBody
          loading={assignments.loading}
          error={assignments.error}
          isEmpty={!visibleAssignments.length}
          emptyMessage="등록된 과제가 없습니다."
        >
          <AssignmentRows
            items={visibleAssignments}
            deletingId={deletingId}
            onDelete={handleDelete}
          />
        </ApiStateBody>
        {actionError && <p className="inline-alert error">{actionError}</p>}
      </div>
    </div>
  );

  if (!useApi) {
    return (
      <div className="t-home">
        {flash}
        <PageHero title={heroTitle} description="로그인이 필요합니다." />
      </div>
    );
  }

  return (
    <div className="t-home">
      {flash}
      <PageHero title={heroTitle} description={heroDesc} />

      {!activeSubject ? <AssignShortcuts subjectKey={teacherSubjectKey(user)} onHome /> : null}

      {activeSubject ? <AssignShortcuts subjectKey={activeSubject} /> : null}

      {!activeSubject ? (
        <>
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
        </>
      ) : null}

      {assignmentsCard}
    </div>
  );
}
