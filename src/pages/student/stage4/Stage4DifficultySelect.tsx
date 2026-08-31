import type { Stage4Difficulty, Stage4SetScore } from '../../../api/types';

const LEVELS: Stage4Difficulty[] = ['EASY', 'NORMAL', 'HARD'];

interface Stage4DifficultySelectProps {
  setTitle: string;
  setScore: Stage4SetScore | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onSelect: (assignmentId: string, difficulty: Stage4Difficulty) => void;
  onWriteReport: () => void;
  onViewReport: () => void;
}

export function Stage4DifficultySelect({
  setTitle,
  setScore,
  loading,
  error,
  onBack,
  onSelect,
  onWriteReport,
  onViewReport,
}: Stage4DifficultySelectProps) {
  return (
    <div className="stage-assign">
      <button type="button" className="stage-assign-back" onClick={onBack}>
        ← 과제 목록
      </button>
      <p className="stage-assign-eyebrow">난이도 선택</p>
      <h1 className="stage-assign-title">{setTitle}</h1>
      <p className="stage-assign-desc">
        EASY부터 순서대로 해금됩니다. 보고서는 EASY · NORMAL · HARD 전체에 대해{' '}
        <strong>1번만</strong> 작성합니다.
      </p>

      {loading ? <p className="hint">난이도 불러오는 중…</p> : null}
      {error ? <p className="hint" style={{ color: 'var(--danger, #c0392b)' }}>{error}</p> : null}

      {!loading && setScore ? (
        <>
          <ul className="stage-assign-list stage4-diff-list">
            {LEVELS.map((diff) => {
              const item = setScore.difficulties.find((d) => d.difficulty === diff);
              if (!item) return null;
              const locked = !item.unlocked;
              const status = item.is_cleared
                ? '클리어'
                : locked
                  ? '잠김'
                  : '시작하기';

              return (
                <li key={diff}>
                  <button
                    type="button"
                    className={`stage-assign-row${locked ? ' is-locked' : ''}`}
                    disabled={locked || setScore.report_submitted}
                    onClick={() => {
                      if (!locked) onSelect(String(item.assignment_id), diff);
                    }}
                  >
                    <span className="stage-assign-row-main">
                      <strong>{diff}</strong>
                    </span>
                    <span className="stage-assign-status">{status}</span>
                    <span className="stage-assign-chevron" aria-hidden="true">
                      {locked ? '·' : '→'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="info-card" style={{ marginTop: 16 }}>
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">보고서</p>
            </div>
            {setScore.report_submitted ? (
              <>
                <p className="mission-text">
                  제출 완료 · {setScore.overall_score}점
                  {setScore.is_passed ? ' · 통과' : ''}
                </p>
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" type="button" onClick={onViewReport}>
                    내 보고서 보기
                  </button>
                </div>
              </>
            ) : setScore.can_submit_report ? (
              <>
                <p className="mission-text">
                  {setScore.cleared_count}개 난이도 클리어 · 세트 보고서를 작성할 수 있습니다.
                </p>
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" type="button" onClick={onWriteReport}>
                    보고서 작성
                  </button>
                </div>
              </>
            ) : (
              <p className="hint hint-sm">
                난이도를 1개 이상 클리어하면 보고서를 작성할 수 있습니다.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
