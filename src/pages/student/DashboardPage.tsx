import { Link } from 'react-router-dom';
import {
  fetchStudentDashboardAssignmentsApi,
  fetchStudentDashboardSummaryApi,
} from '../../api';
import type { ProgressStatus, StudentAssignmentItem, StageSummaryItem } from '../../api/types';
import {
  STAGE_SCENARIO_LABELS,
  averageLiteracyScore,
  deriveLiteracyScores,
} from '../../constants/literacyAxes';
import { STUDENT_LEARNING_MODES, learningModeByStage } from '../../constants/navigation';
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

function dueLabel(iso?: string | null) {
  if (!iso) return '마감 없음';
  if (isDueToday(iso)) return '오늘';
  return formatDueAt(iso);
}

function pathForAssignment(item: StudentAssignmentItem) {
  const stage = Number(item.stage ?? 1);
  const safe = stage >= 1 && stage <= 4 ? stage : 1;
  return `/student/stage/${safe}?assignmentId=${item.assignment_id}`;
}

function buildHeroCopy(remaining: DashboardTask[]) {
  const dueToday = remaining.filter((a) => a.dueToday).length;
  if (dueToday > 0) {
    return `오늘 마감인 과제가 ${dueToday}개 있어요. 학습 모드를 골라 이어서 해 보세요.`;
  }
  if (remaining.length > 0) {
    return `남은 과제 ${remaining.length}개 · 아래에서 학습 모드를 선택하세요.`;
  }
  return '오늘은 여유롭게 학습 모드를 골라 복습해 보세요.';
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
        subject: mode?.module ?? STAGE_SCENARIO_LABELS[stage] ?? '학습',
        stage,
        status: item.status,
        dueLabel: dueLabel(item.due_date),
        dueToday: isDueToday(item.due_date),
        remainingAttempts: item.max_attempts != null ? undefined : null,
        href: pathForAssignment(item),
        score: item.score,
      };
    })
    .sort((a, b) => a.stage - b.stage || String(a.id).localeCompare(String(b.id)));

  return {
    studentName: name,
    classLabel,
    attendanceRate: summary.attendance_rate,
    classAverage: null,
    axes,
    tasks,
  };
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo);

  const summary = useFetch(fetchStudentDashboardSummaryApi, [], useApi);
  const assignments = useFetch(fetchStudentDashboardAssignmentsApi, [], useApi);

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

  const remaining = model.tasks.filter((t) => t.status !== 'COMPLETED');
  const completedCount = model.tasks.length - remaining.length;
  const dueToday = remaining.filter((t) => t.dueToday).length;
  const total = averageLiteracyScore(model.axes) || (useApi ? summary.data?.total_score ?? 0 : 0);
  const heroDesc = buildHeroCopy(remaining);

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
                  <p className="done-eyebrow">울산형 AI 리터러시</p>
                  <h1 className="page-title">
                    <span className="dash-hello">안녕하세요,</span>
                    {model.studentName}님
                  </h1>
                  {model.classLabel ? <p className="dash-class">{model.classLabel}</p> : null}
                  <p className="page-desc dash-intro-desc">{heroDesc}</p>
                  <div className="dash-chips">
                    <span className="dash-chip">
                      남은 과제 <strong>{remaining.length}</strong>
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
            </section>

            <section className="mode-section">
              <div className="mode-section-head">
                <h2 className="mode-section-title">오늘의 학습 모드</h2>
                <p className="hint">원하는 과정을 클릭하여 시작하세요.</p>
              </div>
              <div className="mode-grid">
                {STUDENT_LEARNING_MODES.map((mode) => (
                  <Link key={mode.path} to={mode.path} className="mode-card">
                    <span className="mode-card-icon" aria-hidden="true">
                      {mode.icon}
                    </span>
                    <strong className="mode-card-title">{mode.module}</strong>
                    <p className="mode-card-desc">{mode.content}</p>
                    <span className="mode-card-tag">{mode.tag}</span>
                  </Link>
                ))}
              </div>
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
                <section className="info-card dash-tasks-card">
                  <div className="info-card-head">
                    <span className="info-icon" aria-hidden="true">
                      ◎
                    </span>
                    <p className="side-title">남은 과제</p>
                  </div>
                  <ul className="dash-tasks">
                    {remaining.length === 0 ? (
                      <li>
                        <div className="task-main">
                          <p className="task-title">남은 과제가 없어요</p>
                          <span className="task-meta">모두 완료했습니다.</span>
                        </div>
                      </li>
                    ) : (
                      remaining.map((row, idx) => {
                        const cta = row.status === 'IN_PROGRESS' ? '이어하기' : '시작하기';
                        const btnClass =
                          row.status === 'IN_PROGRESS'
                            ? 'btn btn-primary task-go'
                            : 'btn btn-ghost task-go';
                        return (
                          <li key={row.id} className={idx === 0 ? 'is-current' : undefined}>
                            <div className="task-main">
                              <div className="task-top">
                                <p className="task-title">{row.title}</p>
                                <span className={`status-pill ${statusPillClass(row.status)}`}>
                                  {PROGRESS_LABELS[row.status]}
                                </span>
                              </div>
                              <span className="task-meta">
                                {row.subject} · 마감 {row.dueLabel}
                              </span>
                            </div>
                            <Link className={btnClass} to={row.href}>
                              {cta}
                            </Link>
                          </li>
                        );
                      })
                    )}
                  </ul>
                  <p className="dash-tasks-foot hint">
                    {completedCount > 0
                      ? `완료한 과제 ${completedCount}개`
                      : '아직 완료한 과제가 없어요'}
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
