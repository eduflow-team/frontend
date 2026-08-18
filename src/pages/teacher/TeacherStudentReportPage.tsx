import { Link, useParams } from 'react-router-dom';
import { fetchTeacherGradesApi, fetchTeacherRecordsStudentsApi } from '../../api';
import type { ProgressStatus } from '../../api/types';
import { ApiStateBody, PageHero } from '../../components/common';
import { HexLiteracyRadar } from '../../components/student/HexLiteracyRadar';
import {
  LITERACY_AXES,
  averageLiteracyScore,
  deriveLiteracyScores,
} from '../../constants/literacyAxes';
import { STUDENT_LEARNING_MODES, learningModeLabel } from '../../constants/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { PROGRESS_LABELS } from '../../utils/labels';

function statusTone(status?: ProgressStatus) {
  if (status === 'COMPLETED') return 'is-done';
  if (status === 'IN_PROGRESS') return 'is-progress';
  return 'is-wait';
}

function stageKey(stage: number) {
  return `stage_${stage}` as 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4';
}

export function TeacherStudentReportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const id = Number(studentId);
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo && Number.isFinite(id));

  const records = useFetch(fetchTeacherRecordsStudentsApi, [id], useApi);
  const grades = useFetch(fetchTeacherGradesApi, [id], useApi);

  const recordStudent = records.data?.students.find((s) => s.student_id === id);
  const gradeStudent = grades.data?.students.find((s) => s.student_id === id);
  const studentName = recordStudent?.student_name ?? gradeStudent?.student_name;
  const loading = records.loading || grades.loading;
  const error = records.error || grades.error;
  const missing = !loading && !error && !recordStudent && !gradeStudent;

  if (!useApi) {
    return (
      <>
        <PageHero title="학생 리포트" description="데모에서는 학생별 리포트를 확인할 수 없습니다." />
        <div className="card">
          <div className="card-body">
            <Link to="/teacher/students" className="btn btn-ghost btn-sm">
              ← 학생 현황으로
            </Link>
          </div>
        </div>
      </>
    );
  }

  const completedCount = STUDENT_LEARNING_MODES.filter((mode) => {
    const detail = recordStudent?.stage_summary[stageKey(mode.stage)];
    return detail?.status === 'COMPLETED';
  }).length;

  const literacyScores = deriveLiteracyScores(
    STUDENT_LEARNING_MODES.map((mode) => {
      const key = stageKey(mode.stage);
      const progress = recordStudent?.stage_summary[key];
      const detail = gradeStudent?.stage_details[key];
      return {
        stage: mode.stage,
        score: detail?.score ?? progress?.score ?? null,
        status: progress?.status,
      };
    }),
  );
  const literacyAvg = averageLiteracyScore(literacyScores);

  return (
    <div className="t-report">
      <div className="t-report-nav">
        <Link to="/teacher/students" className="t-report-back">
          ← 학생 현황
        </Link>
      </div>

      <PageHero
        title={studentName ? `${studentName} 리포트` : '학생 리포트'}
        description="학습 모드별 진행 상태와 점수를 확인합니다."
      />

      {(loading || error || missing) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <ApiStateBody
              loading={loading}
              error={error}
              isEmpty={missing}
              emptyMessage="해당 학생 기록을 찾을 수 없습니다."
            >
              <span />
            </ApiStateBody>
          </div>
        </div>
      )}

      {!loading && !error && (recordStudent || gradeStudent) && (
        <>
          <section className="card t-report-overview">
            <div className="card-header">
              <span className="card-title">요약 · 육각 점수판</span>
            </div>
            <div className="card-body t-report-overview-body">
              <div className="t-report-overview-side">
                <div className="t-report-metrics">
                  <div className="t-report-metric">
                    <span className="t-report-metric-label">평균 점수</span>
                    <strong className="t-report-metric-value">
                      {gradeStudent?.average_score != null
                        ? `${gradeStudent.average_score}점`
                        : '—'}
                    </strong>
                  </div>
                  <div className="t-report-metric">
                    <span className="t-report-metric-label">완료한 모드</span>
                    <strong className="t-report-metric-value">
                      {completedCount}/{STUDENT_LEARNING_MODES.length}
                    </strong>
                  </div>
                  <div className="t-report-metric">
                    <span className="t-report-metric-label">학급 평균</span>
                    <strong className="t-report-metric-value">
                      {grades.data?.stage_averages.total_average != null
                        ? `${grades.data.stage_averages.total_average}점`
                        : '—'}
                    </strong>
                  </div>
                  <div className="t-report-metric">
                    <span className="t-report-metric-label">리터러시 6축 평균</span>
                    <strong className="t-report-metric-value">{literacyAvg}점</strong>
                  </div>
                </div>

                <ul className="hex-legend">
                  {LITERACY_AXES.map((axis) => {
                    const score = literacyScores[axis.key];
                    return (
                      <li key={axis.key}>
                        <span className="axis-name">{axis.label}</span>
                        <span className={`axis-score${score == null ? ' is-null' : ''}`}>
                          {score == null ? '미이수' : `${score}점`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="t-report-overview-hex">
                <p className="t-report-hex-label">육각 점수판</p>
                <HexLiteracyRadar scores={literacyScores} />
              </div>
            </div>
          </section>

          <div className="t-report-grid">
            {STUDENT_LEARNING_MODES.map((mode) => {
              const key = stageKey(mode.stage);
              const progress = recordStudent?.stage_summary[key];
              const detail = gradeStudent?.stage_details[key];
              const status = progress?.status ?? 'NOT_STARTED';
              const score = detail?.score ?? progress?.score;

              return (
                <article key={mode.stage} className="t-report-mode card">
                  <div className="card-header t-report-mode-head">
                    <div>
                      <div className="t-report-mode-kicker">{learningModeLabel(mode.stage)}</div>
                      <div className="card-title">{mode.content}</div>
                    </div>
                    <span className={`t-report-pill ${statusTone(status)}`}>
                      {PROGRESS_LABELS[status]}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="t-report-score-row">
                      <span>점수</span>
                      <strong>{score != null ? `${score}점` : '—'}</strong>
                    </div>
                    <p className="t-report-summary">
                      {detail?.summary?.trim() ||
                        (status === 'COMPLETED'
                          ? '제출이 완료된 학습 모드입니다.'
                          : status === 'IN_PROGRESS'
                            ? '학생이 활동을 진행 중입니다.'
                            : '아직 시작하지 않았습니다.')}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
