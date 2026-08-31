import { Link } from 'react-router-dom';
import type {
  Stage2AssignmentDetailResponse,
  Step2CorrectionResponse,
  Step2HighlightResponse,
} from '../../../api/types';

type Rubric = { evidence: string; errorId: string; rewrite: string };

const TYPE_LABELS: Record<string, string> = {
  PERSONA_BIAS: '페르소나 편향',
  INFORMATION_FABRICATION: '정보 날조',
  RETRIEVAL_ERROR: '잘못된 문서 검색',
};

function rubricMarkLabel(mark: string) {
  if (mark === '✓') return '완료';
  if (mark === '△') return '부분';
  return '미완료';
}

function headlineFor(score: number | null, passed: boolean | null) {
  if (score == null) return '환각 탐지를 마쳤습니다';
  if (passed) return '환각을 잘 잡고 교정까지 완료했어요';
  if (score >= 70) return '탐지는 잘 했고, 교정은 조금 더 다듬어 보세요';
  return '이번 라운드를 마쳤습니다. 피드백을 확인해 보세요';
}

function adviceFor(
  correction: Step2CorrectionResponse | null,
  lastFind: Step2HighlightResponse['results'][number] | null,
) {
  const fromCorrection = correction?.feedback_details?.[0]?.ai_feedback?.trim();
  if (fromCorrection) return fromCorrection;
  const fromFind = lastFind?.evaluation_report?.ai_feedback?.trim();
  if (fromFind) return fromFind;
  if (correction?.final_correct_sentence) return correction.final_correct_sentence;
  return '찾은 오류와 교정 내용을 아래에서 다시 확인해 보세요.';
}

export type Stage2DoneProps = {
  detail: Stage2AssignmentDetailResponse;
  title: string;
  rubric: Rubric;
  correctionResult: Step2CorrectionResponse | null;
  lastFindResult: Step2HighlightResponse['results'][number] | null;
  onRetry?: () => void;
};

export function StudentStage2Done({
  detail,
  title,
  rubric,
  correctionResult,
  lastFindResult,
  onRetry,
}: Stage2DoneProps) {
  const score = correctionResult?.score ?? null;
  const passed = correctionResult?.is_passed ?? null;
  const used = detail.attempts.used_attempts ?? 0;
  const max = detail.attempts.max_attempts ?? 5;
  const foundCount = detail.cleared_highlights?.length ?? 0;
  const expected = detail.expected_error_count ?? foundCount;

  const reviewRows =
    correctionResult?.feedback_details?.length
      ? correctionResult.feedback_details
      : detail.cleared_highlights.map((h) => ({
          student_found_error: h,
          student_answer: '',
          is_item_passed: true,
          hallucination_reason: '',
          reference_evidence: '',
          ai_feedback: lastFindResult?.evaluation_report?.ai_feedback || '',
        }));

  const findType =
    lastFindResult?.student_error_type ||
    lastFindResult?.correct_error_type ||
    detail.hallucination_type_hints?.[0] ||
    '';
  const findTypeLabel = TYPE_LABELS[findType] || findType || '—';
  const findReason = lastFindResult?.student_reason?.trim() || '';

  const looksLikeSet = /카드\s*\d+/i.test(title) || /카드\s*\d+/i.test(detail.title || '');
  const nextCardTo = '/student';

  return (
    <div className="s2-student">
      <div className="shell wide s2-done-shell">
        <header className="topbar">
          <div className="brand">
            <strong>EduFlow</strong>
            <span>학생 · Hallucination 탐지</span>
          </div>
        </header>

        <nav className="steps" aria-label="진행 단계">
          <div className="step is-done">과제 선택</div>
          <div className="step is-done">환각 탐지</div>
          <div className="step is-current" aria-current="step">
            결과 확인
          </div>
        </nav>

        <section className="score-hero">
          <div
            className="score-ring"
            style={{ ['--p' as string]: String(score ?? 100) }}
            aria-label={score != null ? `점수 ${score}` : '완료'}
          >
            <div className="inner">
              <strong>{score != null ? score : '✓'}</strong>
              <span>{score != null ? '교정 점수' : '완료'}</span>
            </div>
          </div>
          <div className="score-copy">
            <h1>{headlineFor(score, passed)}</h1>
            <p>{adviceFor(correctionResult, lastFindResult)}</p>
            <p className="hint hint-sm s2-done-topic">{title}</p>
            {passed != null && (
              <span className={`s2-done-badge${passed ? ' is-pass' : ' is-fail'}`}>
                {passed ? '교정 통과' : '교정 미통과'}
              </span>
            )}
          </div>
        </section>

        <div className="tally">
          <div className="tally-item">
            <strong>
              {used}/{max}
            </strong>
            <span>시도 횟수</span>
          </div>
          <div className="tally-item good">
            <strong>
              {foundCount}
              {expected > 0 ? ` / ${expected}` : ''}
            </strong>
            <span>찾은 오류</span>
          </div>
          <div className={`tally-item${passed === false ? ' bad' : ' good'}`}>
            <strong>{passed == null ? '—' : passed ? '통과' : '미통과'}</strong>
            <span>교정</span>
          </div>
          <div className="tally-item">
            <strong>
              {[rubric.evidence, rubric.errorId, rubric.rewrite].filter((m) => m === '✓').length}/3
            </strong>
            <span>루브릭 완료</span>
          </div>
        </div>

        <section className="info-card s2-done-rubric-card">
          <div className="info-card-head">
            <span className="info-icon" aria-hidden="true">
              ◇
            </span>
            <p className="side-title">채점 기준 · 최종</p>
          </div>
          <p className="mission-text s2-done-rubric-lead">
            이 점수는 글솜씨가 아니라, 오류 위치를 잡았는지·유형을 구분했는지·교과 근거로
            고쳤는지를 봅니다.
          </p>
          <div className="rubric-list">
            <div className="rubric-item">
              <span>근거 인용</span>
              <span className="s2-done-rubric-status">
                {rubricMarkLabel(rubric.evidence)}
                <span className={`rubric-dot ${
                  rubric.evidence === '✓'
                    ? 'rubric-dot-full'
                    : rubric.evidence === '△'
                      ? 'rubric-dot-half'
                      : 'rubric-dot-empty'
                }`} />
              </span>
            </div>
            <div className="rubric-item">
              <span>오류 식별</span>
              <span className="s2-done-rubric-status">
                {rubricMarkLabel(rubric.errorId)}
                <span className={`rubric-dot ${
                  rubric.errorId === '✓'
                    ? 'rubric-dot-full'
                    : rubric.errorId === '△'
                      ? 'rubric-dot-half'
                      : 'rubric-dot-empty'
                }`} />
              </span>
            </div>
            <div className="rubric-item rubric-item-last">
              <span>재서술</span>
              <span className="s2-done-rubric-status">
                {rubricMarkLabel(rubric.rewrite)}
                <span className={`rubric-dot ${
                  rubric.rewrite === '✓'
                    ? 'rubric-dot-full'
                    : rubric.rewrite === '△'
                      ? 'rubric-dot-half'
                      : 'rubric-dot-empty'
                }`} />
              </span>
            </div>
          </div>
        </section>

        {(findTypeLabel !== '—' || findReason) && (
          <section className="info-card s2-done-find-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ▦
              </span>
              <p className="side-title">탐지 요약</p>
            </div>
            <p className="s2-done-meta-row">
              <strong>환각 유형</strong>
              <span>{findTypeLabel}</span>
            </p>
            {findReason && (
              <p className="s2-done-meta-row">
                <strong>내가 쓴 근거</strong>
                <span>{findReason}</span>
              </p>
            )}
          </section>
        )}

        <div className="debate-head">
          <div>
            <h1>오류 · 교정 리뷰</h1>
            <p className="topic">찾은 문장과 교정한 문장을 나란히 확인해 보세요.</p>
          </div>
        </div>

        <div className="review">
          {reviewRows.length === 0 ? (
            <p className="hint">기록된 오류가 없습니다.</p>
          ) : (
            reviewRows.map((row, i) => (
              <div
                key={`${row.student_found_error}-${i}`}
                className={`review-row${row.is_item_passed ? '' : ' is-wrong'}`}
              >
                <span className="side find">오류</span>
                <div className="claim-text">
                  <span className="s2-done-before">{row.student_found_error || '—'}</span>
                  {row.student_answer ? (
                    <em>
                      교정 → {row.student_answer}
                      {row.ai_feedback ? ` · ${row.ai_feedback}` : ''}
                    </em>
                  ) : row.ai_feedback ? (
                    <em>{row.ai_feedback}</em>
                  ) : (
                    <em>교정 문장 기록이 없습니다.</em>
                  )}
                </div>
                <span className={`mark ${row.is_item_passed ? 'ok' : 'miss'}`}>
                  {row.is_item_passed ? '통과' : '미흡'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="actions s2-done-actions">
          <Link to="/student" className="btn btn-primary">
            학습 화면으로
          </Link>
          {looksLikeSet && (
            <Link to={nextCardTo} className="btn btn-ghost">
              다음 카드
            </Link>
          )}
          {onRetry && (
            <button type="button" className="btn btn-ghost" onClick={onRetry}>
              다른 과제 보기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
