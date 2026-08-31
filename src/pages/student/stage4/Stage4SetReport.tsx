import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  getStudentStep4SetApi,
  postStudentStep4SubmitApi,
} from '../../../api';
import type { Stage4Report, Stage4SetScore, Stage4SubmitResponse } from '../../../api/types';
import { Stage4ReportReview } from './Stage4ReportReview';
import { Stage4HintsModal } from './Stage4HintsModal';

type ReportMode = 'write' | 'view';

interface Stage4SetReportProps {
  entryAssignmentId: string;
  setTitle: string;
  initialMode?: ReportMode;
  onBack: () => void;
  onSubmitted?: (setScore: Stage4SetScore) => void;
}

function Toast({ message }: { message: string }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}

/** Stage4 세트 보고서 — EASY/NORMAL/HARD 통합 1회 작성 */
export function Stage4SetReport({
  entryAssignmentId,
  setTitle,
  initialMode = 'write',
  onBack,
  onSubmitted,
}: Stage4SetReportProps) {
  const [setScore, setSetScore] = useState<Stage4SetScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ReportMode>(initialMode);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [submitResult, setSubmitResult] = useState<Stage4SubmitResponse | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [report, setReport] = useState<Stage4Report>({
    successful_attacks: '',
    failed_attacks: '',
    why_breached: '',
    defense_ideas: '',
  });

  const loadSet = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudentStep4SetApi(entryAssignmentId);
      setSetScore(data);
      if (data.submitted_report) {
        setReport(data.submitted_report);
        setMode('view');
      } else {
        setMode(initialMode === 'view' && data.can_submit_report ? 'write' : initialMode);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '보고서 정보를 불러오지 못했습니다.');
      setSetScore(null);
    } finally {
      setLoading(false);
    }
  }, [entryAssignmentId, initialMode]);

  useEffect(() => {
    void loadSet();
  }, [loadSet]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const submitReport = async () => {
    if (!setScore?.can_submit_report || submitBusy) return;
    const { successful_attacks, failed_attacks, why_breached, defense_ideas } = report;
    if (
      !successful_attacks.trim() ||
      !failed_attacks.trim() ||
      !why_breached.trim() ||
      !defense_ideas.trim()
    ) {
      setToast('보고서 4개 항목을 모두 작성해 주세요');
      return;
    }
    setSubmitBusy(true);
    try {
      const res = await postStudentStep4SubmitApi(entryAssignmentId, { report });
      setSubmitResult(res);
      setSetScore(res.set);
      setMode('view');
      onSubmitted?.(res.set);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : '보고서 제출에 실패했습니다.');
    } finally {
      setSubmitBusy(false);
    }
  };

  const ev = submitResult?.evaluation_report ?? setScore?.evaluation_report;
  const currentScore = submitResult?.current_score ?? setScore?.current_score ?? setScore?.overall_score;
  const isPassed = submitResult?.is_passed ?? setScore?.is_passed ?? false;
  const displaySet = submitResult?.set ?? setScore;

  if (loading) {
    return (
      <div className="s4">
        <div className="shell wide">
          <p className="hint">보고서 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (error || !setScore) {
    return (
      <div className="s4">
        <div className="shell wide">
          <button type="button" className="stage-assign-back" onClick={onBack}>
            ← 난이도 선택
          </button>
          <p className="hint">{error || '보고서를 불러올 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  const unlockedHintCount =
    setScore.difficulty_hints?.reduce(
      (sum, group) => sum + group.hints.filter((h) => h.unlocked).length,
      0,
    ) ?? 0;

  const hintsButton = (
    <button className="btn btn-ghost btn-small" type="button" onClick={() => setHintsOpen(true)}>
      힌트 보기{unlockedHintCount > 0 ? ` (${unlockedHintCount})` : ''}
    </button>
  );

  const hintsModal = (
    <Stage4HintsModal
      open={hintsOpen}
      onClose={() => setHintsOpen(false)}
      title="실습 힌트 목록"
      subtitle="EASY · NORMAL · HARD 각 난이도에서 확인한 힌트입니다."
      difficultyHints={setScore.difficulty_hints ?? []}
    />
  );

  if (mode === 'write' && setScore.can_submit_report) {
    return (
      <div className="s4">
        <div className="shell wide">
          <button type="button" className="stage-assign-back" onClick={onBack}>
            ← 난이도 선택
          </button>

          <nav className="steps" aria-label="진행 단계">
            <div className="step">난이도 선택</div>
            <div className="step" aria-current="step">
              보고서
            </div>
            <div className="step">결과</div>
          </nav>

          <section className="report-panel">
            <div className="report-panel-head">
              <h2>보안 분석 보고서</h2>
              {hintsButton}
            </div>
            <p className="hint" style={{ marginBottom: 18 }}>
              {setTitle} · EASY · NORMAL · HARD 전체 실습에 대한 보고서입니다. 세트당 1회만
              제출할 수 있습니다.
            </p>
            <div className="stack">
              <div className="field-group">
                <label className="label" htmlFor="saInput">
                  통한 공격 *
                </label>
                <textarea
                  id="saInput"
                  className="field"
                  rows={3}
                  value={report.successful_attacks}
                  onChange={(e) => setReport((r) => ({ ...r, successful_attacks: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="label" htmlFor="faInput">
                  막힌 공격 *
                </label>
                <textarea
                  id="faInput"
                  className="field"
                  rows={3}
                  value={report.failed_attacks}
                  onChange={(e) => setReport((r) => ({ ...r, failed_attacks: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="label" htmlFor="wbInput">
                  왜 뚫렸나 *
                </label>
                <textarea
                  id="wbInput"
                  className="field"
                  rows={3}
                  value={report.why_breached}
                  onChange={(e) => setReport((r) => ({ ...r, why_breached: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="label" htmlFor="diInput">
                  어떻게 막으면 좋을까 * (2가지 이상)
                </label>
                <textarea
                  id="diInput"
                  className="field"
                  rows={3}
                  value={report.defense_ideas}
                  onChange={(e) => setReport((r) => ({ ...r, defense_ideas: e.target.value }))}
                />
              </div>
              <div className="actions">
                <button className="btn btn-ghost" type="button" onClick={onBack}>
                  취소
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={submitBusy}
                  onClick={() => void submitReport()}
                >
                  {submitBusy ? '제출 중…' : '제출하고 결과 보기'}
                </button>
              </div>
            </div>
          </section>
        </div>
        {hintsModal}
        <Toast message={toast} />
      </div>
    );
  }

  if (!setScore.report_submitted || !setScore.submitted_report || !ev) {
    return (
      <div className="s4">
        <div className="shell wide">
          <button type="button" className="stage-assign-back" onClick={onBack}>
            ← 난이도 선택
          </button>
          <div className="report-panel-head" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>보고서</h2>
            {hintsButton}
          </div>
          <p className="hint">
            {setScore.cleared_count > 0
              ? '보고서를 작성할 수 있습니다.'
              : '난이도를 1개 이상 클리어한 뒤 보고서를 작성할 수 있습니다.'}
          </p>
          {setScore.can_submit_report ? (
            <div className="actions">
              <button className="btn btn-primary" type="button" onClick={() => setMode('write')}>
                보고서 작성
              </button>
            </div>
          ) : null}
        </div>
        {hintsModal}
      </div>
    );
  }

  return (
    <div className="s4">
      <div className="shell wide">
        <button type="button" className="stage-assign-back" onClick={onBack}>
          ← 난이도 선택
        </button>

        <div className="report-panel-head" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>결과</h2>
          {hintsButton}
        </div>

        <nav className="steps" aria-label="진행 단계">
          <div className="step">난이도 선택</div>
          <div className="step">보고서</div>
          <div className="step" aria-current="step">
            결과
          </div>
        </nav>

        <section className="score-hero">
          <div
            className="score-ring"
            style={{ ['--p' as string]: String(displaySet?.overall_score ?? 0) }}
          >
            <div className="inner">
              <strong>{displaySet?.overall_score ?? 0}</strong>
              <span>최종 점수</span>
            </div>
          </div>
          <div className="score-copy">
            <h1>{isPassed ? '합격' : '미달'}</h1>
            <p>
              보고서 {currentScore ?? 0}점 · 클리어 {displaySet?.cleared_count ?? 0}/3
            </p>
            <p className="hint hint-sm">{ev.feedback}</p>
          </div>
        </section>

        <div className="tally">
          <div className="tally-item">
            <strong>{ev.clear_score}</strong>
            <span>클리어</span>
          </div>
          <div className="tally-item">
            <strong>{ev.efficiency_score}</strong>
            <span>효율</span>
          </div>
          <div className="tally-item">
            <strong>{ev.analysis_score}</strong>
            <span>분석</span>
          </div>
          <div className="tally-item">
            <strong>{displaySet?.cleared_count ?? 0}/3</strong>
            <span>클리어 난이도</span>
          </div>
        </div>

        <Stage4ReportReview difficulty="세트" report={setScore.submitted_report} />

        {displaySet ? (
          <section className="info-card" style={{ marginTop: 18 }}>
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">난이도별 클리어</p>
            </div>
            <div className="attack-log">
              {displaySet.difficulties.map((d) => (
                <div key={d.difficulty} className="log-item hold">
                  <span className="tag">{d.difficulty}</span>
                  <span>
                    {d.is_cleared ? '클리어' : d.unlocked ? '미클리어' : '잠김'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="actions" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            난이도 선택으로
          </button>
        </div>
      </div>
      {hintsModal}
    </div>
  );
}
