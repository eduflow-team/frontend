import { Link, useParams } from 'react-router-dom';
import {
  fetchStudentDashboardAssignmentsApi,
  fetchStudentDashboardSummaryApi,
  fetchStudentNoticesApi,
} from '../../api';
import type { ProgressStatus, StudentAssignmentItem, StageSummaryItem } from '../../api/types';
import { SubjectTabs } from '../../components/common/SubjectTabs';
import {
  SUBJECT_OPTIONS,
  normalizeSubjectKey,
  subjectLabel,
} from '../../constants/assignments';
import {
  STAGE_SCENARIO_LABELS,
  averageLiteracyScore,
  deriveLiteracyScores,
} from '../../constants/literacyAxes';
import {
  STUDENT_LEARNING_MODES,
  learningModeByStage,
  subjectPageTitle,
} from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import {
  STUDENT_DASHBOARD_DEMO,
  type DashboardTask,
  type StudentDashboardViewModel,
} from '../../mocks/studentDashboard';
import { formatDueAt } from '../../utils/datetime';
import { PROGRESS_LABELS } from '../../utils/labels';

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
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function pathForAssignment(item: StudentAssignmentItem) {
  const stage = Number(item.stage ?? 1);
  const safe = stage >= 1 && stage <= 4 ? stage : 1;
  const subject = normalizeSubjectKey(item.subject);
  return `/student/${subject}/stage/${safe}?assignmentId=${item.assignment_id}`;
}

function buildHeroCopy(remaining: DashboardTask[]) {
  const dueToday = remaining.filter((a) => a.dueToday).length;
  if (dueToday > 0) {
    return `오늘 마감인 과제가 ${dueToday}개 있어요. 아래에서 과제를 선택해 시작하세요.`;
  }
  if (remaining.length > 0) {
    return `남은 과제 ${remaining.length}개 · 아래에서 과제를 선택하세요.`;
  }
  return '배정된 과제가 모두 완료되었습니다.';
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
  const tasks: DashboardTask[] = assignments
    .map((item) => {
      const stage = Number(item.stage ?? 1);
      const mode = learningModeByStage(stage);
      return {
        id: item.assignment_id,
        title: item.title ?? `과제 #${item.assignment_id}`,
        subjectKey: normalizeSubjectKey(item.subject),
        subjectLabel: subjectLabel(item.subject),
        modeLabel: mode?.module ?? STAGE_SCENARIO_LABELS[stage] ?? '학습',
        stage,
        status: item.status,
        dueLabel: dueLabel(item.due_date),
        dueToday: isDueToday(item.due_date),
        dueSoon: isDueWithin24Hours(item.due_date),
        remainingAttempts: item.max_attempts != null ? undefined : null,
        href: pathForAssignment(item),
        score: item.score,
      };
    })
    .sort(
      (a, b) =>
        a.subjectKey.localeCompare(b.subjectKey) ||
        a.stage - b.stage ||
        String(a.id).localeCompare(String(b.id)),
    );

  return {
    studentName: name,
    classLabel,
    attendanceRate: summary.attendance_rate,
    classAverage: null,
    axes,
    tasks,
  };
}

function AssignmentTaskList({ tasks }: { tasks: DashboardTask[] }) {
  if (!tasks.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 8px' }}>
        <p className="hint">배정된 과제가 없습니다.</p>
      </div>
    );
  }

  return (
    <ul className="assignment-list">
      {tasks.map((task) => {
        const mode = learningModeByStage(task.stage);
        const cta =
          task.status === 'COMPLETED'
            ? '결과 보기'
            : task.status === 'IN_PROGRESS'
              ? '이어하기'
              : '시작하기';
        const btnClass =
          task.status === 'IN_PROGRESS'
            ? 'btn btn-primary task-go'
            : task.status === 'COMPLETED'
              ? 'btn btn-ghost task-go'
              : 'btn btn-ghost task-go';
        return (
          <li key={task.id} className={`assignment-item${task.dueSoon ? ' is-urgent' : ''}`}>
            <span className="assignment-icon" aria-hidden="true">
              {mode?.icon ?? '◇'}
            </span>
            <div className="assignment-main">
              <div className="assignment-top">
                <p className="assignment-title">{task.title}</p>
                <span className={`status-pill ${statusPillClass(task.status)}`}>
                  {PROGRESS_LABELS[task.status]}
                </span>
              </div>
              <span className="assignment-meta">
                {task.subjectLabel} · {task.modeLabel} · 마감 {task.dueLabel}
                {task.score != null ? ` · ${task.score}점` : ''}
              </span>
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

export function StudentDashboardPage() {
  const { subject: subjectParam } = useParams<{ subject?: string }>();
  const activeSubject = subjectParam ? normalizeSubjectKey(subjectParam) : null;
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo);

  const summary = useFetch(fetchStudentDashboardSummaryApi, [], useApi);
  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], useApi);
  const notices = useFetch(
    () => fetchStudentNoticesApi({ page: 1, size: 8 }),
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

  const visibleTasks = activeSubject
    ? model.tasks.filter((task) => task.subjectKey === activeSubject)
    : model.tasks;
  const remainingVisible = visibleTasks.filter((t) => t.status !== 'COMPLETED');
  const completedCount = visibleTasks.length - remainingVisible.length;
  const dueToday = remainingVisible.filter((t) => t.dueToday).length;
  const total = averageLiteracyScore(model.axes) || (useApi ? summary.data?.total_score ?? 0 : 0);
  const heroDesc = buildHeroCopy(remainingVisible);
  const sectionTitle = activeSubject
    ? `${subjectPageTitle(activeSubject)} 과제`
    : '남은 과제';

  const stageProgress = STUDENT_LEARNING_MODES.map((mode) => {
    const stageTasks = model.tasks.filter((t) => t.stage === mode.stage);
    const done = stageTasks.filter((t) => t.status === 'COMPLETED').length;
    const pct = stageTasks.length ? Math.round((done / stageTasks.length) * 100) : 0;
    const score =
      stageTasks.find((t) => t.score != null)?.score ??
      (useApi
        ? summary.data?.stage_summary.find((s) => s.stage === mode.stage)?.score
        : model.axes && null);
    return { mode, pct, score, hasTask: stageTasks.length > 0 };
  });

  const weekPct = Math.round(
    stageProgress.reduce((sum, s) => sum + s.pct, 0) / Math.max(1, stageProgress.length),
  );

  return (
    <div className="s-dash">
      <div className="shell wide">
        {loading ? (
          <p className="hint">대시보드를 불러오는 중…</p>
        ) : error ? (
          <p className="hint">{error}</p>
        ) : (
          <>
            <section className="dash-hero">
              <div className="dash-hero-main">
                <div className="dash-intro">
                  <h1 className="page-title">
                    <span className="dash-hello">안녕하세요,</span>
                    {model.studentName}님
                  </h1>
                  {model.classLabel ? <p className="dash-class">{model.classLabel}</p> : null}
                  <p className="page-desc dash-intro-desc">{heroDesc}</p>
                  <div className="dash-chips">
                    <span className="dash-chip">
                      남은 과제 <strong>{remainingVisible.length}</strong>
                    </span>
                    <span className="dash-chip">
                      출석 <strong>{Math.round(model.attendanceRate)}%</strong>
                    </span>
                    {dueToday > 0 ? (
                      <span className="dash-chip is-accent">오늘 마감 {dueToday}</span>
                    ) : (
                      <span className="dash-chip">
                        완료 <strong>{completedCount}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <section className="info-card dash-week-card">
                  <div className="info-card-head">
                    <span className="info-icon" aria-hidden="true">
                      ◷
                    </span>
                    <p className="side-title">이번 주 진도율</p>
                  </div>
                  <p className="progress-label">
                    학습 모드 달성률 <strong>{weekPct}%</strong>
                  </p>
                  <div className="skill-bar-track thick">
                    <span style={{ width: `${weekPct}%` }} />
                  </div>
                </section>

                <div className="dash-total">
                  <p className="dash-total-label">전체 AI 리터러시</p>
                  <div className="dash-ring" aria-hidden="true">
                    <svg viewBox="0 0 120 120" className="dash-ring-svg">
                      <circle className="dash-ring-track" cx="60" cy="60" r="52" />
                      <circle
                        className="dash-ring-value"
                        cx="60"
                        cy="60"
                        r="52"
                        style={{ ['--p' as string]: String(total) }}
                      />
                    </svg>
                    <div className="dash-ring-score">
                      <strong>{total}</strong>
                      <span>점</span>
                    </div>
                  </div>
                  <p className="dash-total-meta">
                    <Link to="/student/results" className="dash-link">
                      육각 점수판 보기
                    </Link>
                  </p>
                </div>
              </div>
            </section>

            <SubjectTabs basePath="/student" activeSubject={activeSubject} />

            <section className="mode-section">
              <div className="mode-section-head">
                <div className="info-card-head mode-section-head-main">
                  <span className="info-icon" aria-hidden="true">
                    ◎
                  </span>
                  <h2 className="mode-section-title">{sectionTitle}</h2>
                </div>
                <p className="hint">과제를 클릭하여 바로 시작하세요.</p>
              </div>
              {activeSubject ? (
                <AssignmentTaskList tasks={visibleTasks} />
              ) : (
                <div className="subject-sections">
                  {SUBJECT_OPTIONS.map((subject) => {
                    const subjectTasks = model.tasks.filter(
                      (task) => task.subjectKey === subject.value,
                    );
                    if (!subjectTasks.length) return null;
                    return (
                      <section key={subject.value} className="subject-assignment-group">
                        <div className="subject-assignment-head">
                          <h3 className="subject-assignment-title">{subject.label}</h3>
                          <Link to={`/student/subject/${subject.value}`} className="dash-link">
                            과목만 보기
                          </Link>
                        </div>
                        <AssignmentTaskList tasks={subjectTasks} />
                      </section>
                    );
                  })}
                  {!model.tasks.length ? <AssignmentTaskList tasks={[]} /> : null}
                </div>
              )}
            </section>

            <div className="dash-layout dash-layout-home">
              <section className="info-card">
                <div className="info-card-head">
                  <span className="info-icon" aria-hidden="true">
                    ▤
                  </span>
                  <p className="side-title">나의 AI 활용 역량</p>
                </div>
                <ul className="skill-bars">
                  {stageProgress.map(({ mode, pct, score }) => (
                    <li key={mode.stage}>
                      <div className="skill-bar-top">
                        <span>{mode.module}</span>
                        <strong>{score != null ? score : pct}</strong>
                      </div>
                      <div className="skill-bar-track">
                        <span style={{ width: `${score != null ? score : pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="dash-side">
                <section className="info-card dash-notices-card">
                  <div className="info-card-head">
                    <span className="info-icon" aria-hidden="true">
                      📢
                    </span>
                    <p className="side-title">공지사항</p>
                  </div>
                  {!useApi ? (
                    <p className="hint dash-notices-empty">로그인하면 학급 공지를 확인할 수 있습니다.</p>
                  ) : notices.loading ? (
                    <p className="hint dash-notices-empty">공지를 불러오는 중…</p>
                  ) : notices.error ? (
                    <p className="hint dash-notices-empty">{notices.error}</p>
                  ) : !notices.data?.notices.length ? (
                    <p className="hint dash-notices-empty">등록된 공지가 없습니다.</p>
                  ) : (
                    <ul className="dash-notices">
                      {notices.data.notices.map((notice) => (
                        <li key={notice.notice_id} className={notice.is_new ? 'is-new' : undefined}>
                          <div className="notice-main">
                            <div className="notice-top">
                              <p className="notice-title">{notice.title}</p>
                              {notice.is_new ? <span className="notice-badge">NEW</span> : null}
                            </div>
                            <span className="notice-meta">
                              {notice.author_name}
                              {notice.created_at ? ` · ${noticeDateLabel(notice.created_at)}` : ''}
                            </span>
                            <p className="notice-preview">{notice.content}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="dash-notices-foot">
                    <Link to="/student/notices" className="dash-link">
                      전체 공지 보기
                    </Link>
                  </p>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
