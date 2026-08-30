import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchStudentDashboardAssignmentsApi,
  fetchStudentDashboardSummaryApi,
  fetchStudentNoticesApi,
} from '../../api';
import type { ProgressStatus, StudentAssignmentItem, StageSummaryItem } from '../../api/types';
import { SUBJECT_OPTIONS, normalizeSubjectKey } from '../../constants/assignments';
import { subjectPageTitle } from '../../constants/navigation';
import { averageLiteracyScore, deriveLiteracyScores } from '../../constants/literacyAxes';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import {
  STUDENT_DASHBOARD_DEMO,
  type DashboardTask,
  type StudentDashboardViewModel,
} from '../../mocks/studentDashboard';
import { formatDueAt } from '../../utils/datetime';
import { PROGRESS_LABELS } from '../../utils/labels';

type TaskSortKey = 'due' | 'subject' | 'status' | 'title';

const TASK_SORT_OPTIONS: { value: TaskSortKey; label: string }[] = [
  { value: 'due', label: '마감 임박순' },
  { value: 'status', label: '진행 상태순' },
  { value: 'subject', label: '과목순' },
  { value: 'title', label: '제목순' },
];

const STATUS_SORT_ORDER: Record<ProgressStatus, number> = {
  IN_PROGRESS: 0,
  NOT_STARTED: 1,
  COMPLETED: 2,
};

function statusPillClass(status: ProgressStatus) {
  if (status === 'COMPLETED') return 'is-done';
  if (status === 'IN_PROGRESS') return 'is-progress';
  return '';
}

function isDueToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isDueWithin24Hours(iso?: string | null) {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  const diff = due.getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

function dueLabel(iso?: string | null) {
  if (!iso) return '마감 없음';
  if (isDueToday(iso)) return '오늘';
  return formatDueAt(iso);
}

function noticeDateLabel(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function pathForAssignment(item: StudentAssignmentItem) {
  const stage = Number(item.stage ?? 1);
  const safe = stage >= 1 && stage <= 4 ? stage : 1;
  const subject = normalizeSubjectKey(item.subject);
  return `/student/${subject}/stage/${safe}?assignmentId=${item.assignment_id}`;
}

function sortTasks(tasks: DashboardTask[], sortKey: TaskSortKey): DashboardTask[] {
  const copy = [...tasks];
  switch (sortKey) {
    case 'subject':
      return copy.sort(
        (a, b) =>
          a.subjectKey.localeCompare(b.subjectKey) || a.title.localeCompare(b.title, 'ko'),
      );
    case 'status':
      return copy.sort(
        (a, b) =>
          STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] ||
          a.title.localeCompare(b.title, 'ko'),
      );
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    case 'due':
    default:
      return copy.sort((a, b) => {
        const aDone = a.status === 'COMPLETED' ? 1 : 0;
        const bDone = b.status === 'COMPLETED' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        if (a.dueToday !== b.dueToday) return a.dueToday ? -1 : b.dueToday ? 1 : 0;
        if (a.dueSoon !== b.dueSoon) return a.dueSoon ? -1 : b.dueSoon ? 1 : 0;
        const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
        return a.title.localeCompare(b.title, 'ko');
      });
  }
}

function buildFromApi(
  name: string,
  classLabel: string,
  summary: { total_score: number; attendance_rate: number; stage_summary: StageSummaryItem[] },
  assignments: StudentAssignmentItem[],
): StudentDashboardViewModel {
  const stageRows = summary.stage_summary.map((s) => {
    if (s.score != null) return s;
    const scored = assignments.filter((a) => Number(a.stage) === s.stage && a.score != null);
    if (!scored.length) return s;
    const avg = Math.round(scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length);
    return { ...s, score: avg };
  });

  const axes = deriveLiteracyScores(stageRows);
  const tasks: DashboardTask[] = assignments.map((item) => ({
    id: item.assignment_id,
    title: item.title ?? `과제 #${item.assignment_id}`,
    subjectKey: normalizeSubjectKey(item.subject),
    subjectLabel: subjectPageTitle(normalizeSubjectKey(item.subject)),
    stage: Number(item.stage ?? 1),
    status: item.status,
    dueAt: item.due_date ?? null,
    dueLabel: dueLabel(item.due_date),
    dueToday: isDueToday(item.due_date),
    dueSoon: isDueWithin24Hours(item.due_date),
    remainingAttempts: item.max_attempts != null ? undefined : null,
    href: pathForAssignment(item),
    score: item.score,
  }));

  return {
    studentName: name,
    classLabel,
    attendanceRate: summary.attendance_rate,
    classAverage: null,
    axes,
    tasks,
  };
}

function AssignmentTaskList({
  tasks,
  showSubject,
}: {
  tasks: DashboardTask[];
  showSubject: boolean;
}) {
  if (!tasks.length) {
    return (
      <div className="s-dash-empty">
        <p className="hint">배정된 과제가 없습니다.</p>
      </div>
    );
  }

  return (
    <ul className="assignment-list">
      {tasks.map((task) => {
        const cta =
          task.status === 'COMPLETED'
            ? '결과 보기'
            : task.status === 'IN_PROGRESS'
              ? '이어하기'
              : '시작하기';
        const btnClass =
          task.status === 'IN_PROGRESS' ? 'btn btn-primary task-go' : 'btn btn-ghost task-go';
        const metaParts = [
          `마감 ${task.dueLabel}`,
          task.score != null ? `${task.score}점` : null,
        ].filter(Boolean);

        return (
          <li key={task.id} className={`assignment-item${task.dueSoon ? ' is-urgent' : ''}`}>
            {showSubject ? (
              <span className="assignment-subject-badge">{task.subjectLabel}</span>
            ) : null}
            <div className="assignment-main">
              <div className="assignment-top">
                <p className="assignment-title">{task.title}</p>
                <span className={`status-pill ${statusPillClass(task.status)}`}>
                  {PROGRESS_LABELS[task.status]}
                </span>
              </div>
              <span className="assignment-meta">{metaParts.join(' · ')}</span>
            </div>
            <Link className={btnClass} to={task.href}>
              {cta}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SubjectShortcuts({ tasks }: { tasks: DashboardTask[] }) {
  return (
    <div className="s-dash-subject-shortcuts">
      {SUBJECT_OPTIONS.map((subject) => {
        const remaining = tasks.filter(
          (t) => t.subjectKey === subject.value && t.status !== 'COMPLETED',
        ).length;
        return (
          <Link
            key={subject.value}
            to={`/student/subject/${subject.value}`}
            className="s-dash-subject-card"
          >
            <span className="s-dash-subject-name">{subject.label}</span>
            <span className="s-dash-subject-count">
              {remaining > 0 ? `남은 과제 ${remaining}` : '완료'}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function StudentDashboardPage() {
  const { subject: subjectParam } = useParams<{ subject?: string }>();
  const activeSubject = subjectParam ? normalizeSubjectKey(subjectParam) : null;
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo);
  const [sortKey, setSortKey] = useState<TaskSortKey>('due');

  const summary = useFetch(fetchStudentDashboardSummaryApi, [], useApi);
  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], useApi);
  const notices = useFetch(
    () => fetchStudentNoticesApi({ page: 1, size: 3 }),
    [],
    useApi,
  );

  const loading = useApi && (summary.loading || assignments.loading);
  const error = useApi ? summary.error || assignments.error : null;

  let model: StudentDashboardViewModel = {
    ...STUDENT_DASHBOARD_DEMO,
    studentName: user?.name ?? STUDENT_DASHBOARD_DEMO.studentName,
    classLabel: user?.className ?? STUDENT_DASHBOARD_DEMO.classLabel,
  };

  if (useApi && summary.data && assignments.data) {
    model = buildFromApi(
      summary.data.student_name || user?.name || '학생',
      user?.className ?? '',
      summary.data,
      assignments.data.assignments,
    );
  }

  const scopeTasks = activeSubject
    ? model.tasks.filter((task) => task.subjectKey === activeSubject)
    : model.tasks;
  const sortedTasks = useMemo(() => sortTasks(scopeTasks, sortKey), [scopeTasks, sortKey]);
  const remainingCount = scopeTasks.filter((t) => t.status !== 'COMPLETED').length;
  const dueTodayCount = scopeTasks.filter((t) => t.status !== 'COMPLETED' && t.dueToday).length;
  const totalScore =
    averageLiteracyScore(model.axes) || (useApi ? summary.data?.total_score ?? 0 : 0);

  const sectionTitle = activeSubject ? `${subjectPageTitle(activeSubject)} 과제` : '전체 과제';
  const recentNotices = notices.data?.notices.slice(0, 2) ?? [];

  return (
    <div className="s-dash">
      <div className="shell wide">
        {loading ? (
          <p className="hint">대시보드를 불러오는 중…</p>
        ) : error ? (
          <p className="hint">{error}</p>
        ) : (
          <>
            <header className={`s-dash-compact-hero${activeSubject ? ' is-subject-page' : ''}`}>
              <div className="s-dash-compact-head">
                <h1 className="page-title s-dash-compact-title">
                  {activeSubject ? (
                    subjectPageTitle(activeSubject)
                  ) : (
                    <>
                      <span className="dash-hello">안녕하세요,</span>
                      {model.studentName}님
                    </>
                  )}
                </h1>
                {!activeSubject && model.classLabel ? (
                  <p className="dash-class">{model.classLabel}</p>
                ) : null}
              </div>
              <div className="s-dash-summary-row">
                <span className="s-dash-summary-stat">
                  남은 과제 <strong>{remainingCount}</strong>
                </span>
                {dueTodayCount > 0 ? (
                  <span className="s-dash-summary-stat is-accent">
                    오늘 마감 <strong>{dueTodayCount}</strong>
                  </span>
                ) : null}
                {!activeSubject ? (
                  <Link to="/student/results" className="s-dash-literacy-link">
                    AI 리터러시 <strong>{totalScore}</strong>점 →
                  </Link>
                ) : null}
              </div>
            </header>

            {!activeSubject ? <SubjectShortcuts tasks={model.tasks} /> : null}

            <section className="mode-section">
              <div className="mode-section-head">
                <div className="mode-section-head-main">
                  <h2 className="mode-section-title">{sectionTitle}</h2>
                  <span className="s-dash-task-count">{scopeTasks.length}개</span>
                </div>
                <label className="s-dash-sort">
                  <span className="s-dash-sort-label">정렬</span>
                  <select
                    className="s-dash-sort-select"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as TaskSortKey)}
                  >
                    {TASK_SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <AssignmentTaskList tasks={sortedTasks} showSubject={!activeSubject} />
            </section>

            {!activeSubject ? (
              <section className="info-card s-dash-notices-compact">
                <div className="info-card-head">
                  <span className="info-icon" aria-hidden="true">
                    📢
                  </span>
                  <p className="side-title">공지사항</p>
                  <Link to="/student/notices" className="s-dash-notices-more">
                    전체 보기
                  </Link>
                </div>
                {!useApi ? (
                  <p className="hint">로그인하면 학급 공지를 확인할 수 있습니다.</p>
                ) : notices.loading ? (
                  <p className="hint">공지를 불러오는 중…</p>
                ) : notices.error ? (
                  <p className="hint">{notices.error}</p>
                ) : !recentNotices.length ? (
                  <p className="hint">등록된 공지가 없습니다.</p>
                ) : (
                  <ul className="s-dash-notice-lines">
                    {recentNotices.map((notice) => (
                      <li key={notice.notice_id}>
                        <Link to="/student/notices" className="s-dash-notice-line">
                          {notice.is_new ? <span className="notice-badge">NEW</span> : null}
                          <span className="s-dash-notice-title">{notice.title}</span>
                          {notice.created_at ? (
                            <span className="s-dash-notice-date">
                              {noticeDateLabel(notice.created_at)}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
