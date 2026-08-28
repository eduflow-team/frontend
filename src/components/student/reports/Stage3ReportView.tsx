import { useRef, useState } from 'react';
import type { Stage3Verdict } from '../../../api/types';
import { DoneSheetBlock, DoneSheetMetaTag, DoneSheetReport } from './DoneSheetReport';

type Stage3Outcome = 'caught' | 'passed' | 'missed' | 'wasted';

export interface Stage3ReportResult {
  topic: string;
  source: string;
  rows: {
    id: string;
    side: string;
    round: string;
    text: string;
    claim: string;
    verdict: Stage3Verdict;
    why: string;
    checked: boolean;
    suspicious: boolean;
    outcome: Stage3Outcome;
  }[];
  caught: number;
  passed: number;
  missed: number;
  wasted: number;
  score: number;
  headline: string;
  advice: string;
  judgment?: string;
}

const VERDICT_LABEL: Record<string, string> = {
  supported: '근거 확인됨',
  exaggerated: '과장됨',
  unsupported: '근거 부족',
  false: '사실과 다름',
};

const MARK = {
  caught: { cls: 'ok', label: '정확히 잡아냄' },
  passed: { cls: 'ok', label: '적절히 넘어감' },
  missed: { cls: 'miss', label: '놓침' },
  wasted: { cls: 'waste', label: '불필요한 검증' },
} as const;

const TALLY_ITEMS = [
  { outcome: 'caught' as const, tone: 'good' as const, label: '허술한 근거를 잡아냄' },
  { outcome: 'passed' as const, tone: 'good' as const, label: '탄탄한 근거를 넘어감' },
  { outcome: 'missed' as const, tone: 'bad' as const, label: '놓친 근거' },
  { outcome: 'wasted' as const, tone: 'bad' as const, label: '불필요한 검증' },
];

const FILTER_HEADLINE: Record<Stage3Outcome, string> = {
  caught: '허술한 근거를 잡아낸 발언',
  passed: '탄탄한 근거를 넘어간 발언',
  missed: '놓친 발언',
  wasted: '불필요하게 검증한 발언',
};

export function Stage3ReportView({ result }: { result: Stage3ReportResult }) {
  const [filter, setFilter] = useState<Stage3Outcome | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const filteredRows = filter ? result.rows.filter((row) => row.outcome === filter) : [];

  const selectFilter = (outcome: Stage3Outcome) => {
    setFilter((prev) => {
      const next = prev === outcome ? null : outcome;
      if (next) {
        window.requestAnimationFrame(() => {
          reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return next;
    });
  };

  const counts: Record<Stage3Outcome, number> = {
    caught: result.caught,
    passed: result.passed,
    missed: result.missed,
    wasted: result.wasted,
  };

  return (
    <DoneSheetReport
      score={result.score}
      scoreLabel="AI 활용 점수"
      meta={
        <>
          <DoneSheetMetaTag>잡아냄 {result.caught}</DoneSheetMetaTag>
          <DoneSheetMetaTag tone="ok">넘어감 {result.passed}</DoneSheetMetaTag>
          <DoneSheetMetaTag tone="bad">놓침 {result.missed}</DoneSheetMetaTag>
          <DoneSheetMetaTag tone="bad">불필요 {result.wasted}</DoneSheetMetaTag>
        </>
      }
    >
      <DoneSheetBlock label="평가 요약">
        <p className="done-feedback">{result.headline}</p>
        <p className="done-feedback" style={{ marginTop: 12 }}>
          {result.advice}
        </p>
        {result.topic ? <p className="done-answer is-muted">{result.topic}</p> : null}
      </DoneSheetBlock>

      {result.judgment ? (
        <DoneSheetBlock label="내 결론">
          <p className="done-feedback">{result.judgment}</p>
        </DoneSheetBlock>
      ) : null}

      <DoneSheetBlock label="판정 결과">
        <div className="s-report-tally-inline" role="group" aria-label="판정 결과 요약">
          {TALLY_ITEMS.map((item) => (
            <button
              key={item.outcome}
              type="button"
              className={`s-report-tally-btn ${item.tone}${filter === item.outcome ? ' is-active' : ''}`}
              aria-pressed={filter === item.outcome}
              onClick={() => selectFilter(item.outcome)}
            >
              <strong>{counts[item.outcome]}</strong>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        {!filter ? (
          <p className="done-answer is-muted">카드를 누르면 판정 결과별 발언을 확인할 수 있습니다.</p>
        ) : null}
      </DoneSheetBlock>

      <DoneSheetBlock label="채점 기준">
        <p className="done-feedback">
          이 점수는 토론의 승패를 평가하지 않습니다. 검증이 필요한 발언에 팩트체커를 썼는지, 믿을
          만한 발언을 불필요하게 검증하지는 않았는지를 봅니다.
        </p>
      </DoneSheetBlock>

      {filter ? (
        <DoneSheetBlock label={FILTER_HEADLINE[filter]}>
          <div ref={reviewRef}>
            <div className="s-report-filter-bar">
              <p className="done-answer is-muted">
                내 판단과 팩트체커의 판정을 나란히 확인해 보세요.
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter(null)}>
                닫기
              </button>
            </div>
            <ul className="s-report-review-list">
              {filteredRows.length === 0 ? (
                <li className="s-report-review-empty">해당하는 발언이 없습니다.</li>
              ) : (
                filteredRows.map((row) => {
                  const mark = MARK[row.outcome] ?? MARK.passed;
                  const wrong = row.outcome === 'missed' || row.outcome === 'wasted';
                  return (
                    <li
                      key={row.id}
                      className={`s-report-review-row${wrong ? ' is-wrong' : ''}`}
                    >
                      <span className="s-report-side">{row.side === 'pro' ? '찬성' : '반대'}</span>
                      <div className="s-report-review-main">
                        <p>{row.claim}</p>
                        <p className="s-report-review-meta">
                          팩트체커 판정 · {VERDICT_LABEL[row.verdict] || row.verdict}
                        </p>
                      </div>
                      <span className={`s-report-outcome is-${mark.cls}`}>{mark.label}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </DoneSheetBlock>
      ) : null}
    </DoneSheetReport>
  );
}
