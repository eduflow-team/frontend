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
import { SubjectTabs } from '../../components/common/SubjectTabs';
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

function AssignShortcuts({ subjectKey }: { subjectKey: SubjectValue }) {
  const subjectName = subjectPageTitle(subjectKey);
  return (
    <section className="t-home-section">
      <div className="t-home-section-head">
        <h2 className="t-home-section-title">{subjectName} · 과제 만들기</h2>
        <p className="t-home-section-desc">학습 모드를 골라 {subjectName} 과제를 만듭니다.</p>
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

  const allAssignments = assignments.data?.assignments ?? [];
  const filteredAssignments = useMemo(() => {
    if (!activeSubject) return allAssignments;
    return allAssignments.filter((item) => assignmentSubjectKey(item) === activeSubject);
  }, [activeSubject, allAssignments]);

  const assignmentsBySubject = useMemo(() => {
    return SUBJECT_OPTIONS.map((subject) => ({
      subject,
      items: allAssignments.filter((item) => assignmentSubjectKey(item) === subject.value),
    }));
  }, [allAssignments]);

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

  const heroTitle = activeSubject
    ? `${subjectPageTitle(activeSubject)} 과제`
    : `안녕하세요, ${user?.name ?? '선생님'} 선생님`;
  const heroDesc = activeSubject
    ? `${subjectPageTitle(activeSubject)} 교과 과제를 확인하고 새 과제를 만들 수 있습니다.`
    : '과목별로 배정된 AI 리터러시 과제를 확인하세요.';

  if (!useApi) {
    const demoAssignments: TeacherAssignmentItem[] = [
      { assignment_id: 101, title: '개항기 RAG 퀴즈', stage: 1, subject: 'hist' },
      { assignment_id: 102, title: '환각 탐지 — 근대사', stage: 2, subject: 'hist' },
      { assignment_id: 201, title: '광합성 AI 토론', stage: 3, subject: 'sci' },
      { assignment_id: 301, title: '시민권 보안 실습', stage: 4, subject: 'soc' },
    ];
    const demoFiltered = activeSubject
      ? demoAssignments.filter((item) => assignmentSubjectKey(item) === activeSubject)
      : demoAssignments;

    return (
      <div className="t-home">
        {flash}
        <PageHero title={heroTitle} description={`${heroDesc} (데모)`} />

        <SubjectTabs basePath="/teacher" activeSubject={activeSubject} />

        {activeSubject ? <AssignShortcuts subjectKey={activeSubject} /> : null}

        {!activeSubject ? (
          <div className="subject-sections">
            {SUBJECT_OPTIONS.map((subject) => {
              const items = demoAssignments.filter(
                (item) => assignmentSubjectKey(item) === subject.value,
              );
              return (
                <section key={subject.value} className="card subject-section-card">
                  <div className="card-header t-home-card-head">
                    <span className="card-title">{subject.label}</span>
                    <Link to={`/teacher/subject/${subject.value}`} className="t-home-card-link">
                      과목 보기 →
                    </Link>
                  </div>
                  <div className="card-body">
                    <AssignmentRows
                      items={items}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                    />
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="card t-home-assignments-card">
            <div className="card-header">
              <span className="card-title">등록된 과제</span>
            </div>
            <div className="card-body">
              <AssignmentRows
                items={demoFiltered}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="t-home">
      {flash}
      <PageHero title={heroTitle} description={heroDesc} />

      <SubjectTabs basePath="/teacher" activeSubject={activeSubject} />

      {activeSubject ? <AssignShortcuts subjectKey={activeSubject} /> : null}

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

      {!activeSubject ? (
        <div className="subject-sections" style={{ marginTop: 16 }}>
          {assignmentsBySubject.map(({ subject, items }) => (
            <div key={subject.value} className="card t-home-assignments-card subject-section-card">
              <div className="card-header t-home-card-head">
                <span className="card-title">{subject.label}</span>
                <Link to={`/teacher/subject/${subject.value}`} className="t-home-card-link">
                  과목 보기 →
                </Link>
              </div>
              <div className="card-body">
                <ApiStateBody
                  loading={assignments.loading}
                  error={assignments.error}
                  isEmpty={!items.length}
                  emptyMessage="등록된 과제가 없습니다."
                >
                  <AssignmentRows
                    items={items}
                    deletingId={deletingId}
                    onDelete={handleDelete}
                  />
                </ApiStateBody>
              </div>
            </div>
          ))}
          {actionError && <p className="inline-alert error">{actionError}</p>}
        </div>
      ) : (
        <div className="card t-home-assignments-card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">등록된 과제</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={assignments.loading}
              error={assignments.error}
              isEmpty={!filteredAssignments.length}
              emptyMessage="등록된 과제가 없습니다."
            >
              <AssignmentRows
                items={filteredAssignments}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            </ApiStateBody>
            {actionError && <p className="inline-alert error">{actionError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
