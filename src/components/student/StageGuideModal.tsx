import { useEffect, useState } from 'react';
import { STAGE_GUIDES, type StageGuide } from '../../constants/stageGuides';

interface StageGuideModalProps {
  stage?: number;
  /** stage 대신 직접 가이드 전달 (활동 입장 팝업 등) */
  guide?: StageGuide;
  onContinue: () => void;
  busy?: boolean;
  busyLabel?: string;
}

function IntroText({ text, highlight }: { text: string; highlight: string }) {
  const parts = text.split('{highlight}');
  return (
    <p className="stage-flow-intro">
      {parts.map((part, i) =>
        i < parts.length - 1 ? (
          <span key={i}>
            {part}
            <b>{highlight}</b>
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export function StageGuideModal({
  stage,
  guide: guideProp,
  onContinue,
  busy = false,
  busyLabel,
}: StageGuideModalProps) {
  const guide = guideProp ?? (stage != null ? STAGE_GUIDES[stage] : undefined);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [stage, guideProp]);

  if (!guide) return null;

  const pages = guide.pages;
  const page = pages[pageIndex];
  const isFirst = pageIndex === 0;
  const isLast = pageIndex >= pages.length - 1;
  const multi = pages.length > 1;

  return (
    <div
      className="stage-flow-modal open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-guide-title"
    >
      <div className="stage-flow-modal-card">
        <header>
          <h2 id="stage-guide-title">{page.title}</h2>
          {multi ? (
            <span className="stage-flow-page-meta">
              {pageIndex + 1} / {pages.length}
            </span>
          ) : null}
        </header>
        <div className="stage-flow-modal-body">
          {page.intro && page.highlight ? (
            <IntroText text={page.intro} highlight={page.highlight} />
          ) : page.intro ? (
            <p className="stage-flow-intro">{page.intro}</p>
          ) : null}
          {page.body ? <p className="stage-flow-intro">{page.body}</p> : null}
          {page.steps && page.steps.length > 0 ? (
            <ol className="stage-flow-guide-list">
              {page.steps.map((step, i) => (
                <li key={step.title}>
                  <span className="stage-flow-guide-num">{i + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {page.calloutTitle && page.calloutBody ? (
            <div className="stage-flow-callout">
              <b>{page.calloutTitle}</b>
              <br />
              {page.calloutBody}
            </div>
          ) : null}
          {page.hint ? <p className="stage-flow-hint">{page.hint}</p> : null}
          {multi ? (
            <div className="stage-flow-dots" aria-hidden="true">
              {pages.map((_, i) => (
                <span
                  key={`dot-${i}`}
                  className={`stage-flow-dot${i === pageIndex ? ' active' : ''}`}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="stage-flow-modal-foot">
          {multi && !isFirst ? (
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              이전
            </button>
          ) : (
            <span />
          )}
          {isLast ? (
            <button className="btn btn-primary" type="button" disabled={busy} onClick={onContinue}>
              {busy ? busyLabel ?? '준비 중…' : guide.cta}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy}
              onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
            >
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
