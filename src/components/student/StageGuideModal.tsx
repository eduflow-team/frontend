import { STAGE_GUIDES } from '../../constants/stageGuides';

interface StageGuideModalProps {
  stage: number;
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
  onContinue,
  busy = false,
  busyLabel,
}: StageGuideModalProps) {
  const guide = STAGE_GUIDES[stage];
  if (!guide) return null;

  return (
    <div
      className="stage-flow-modal open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-guide-title"
    >
      <div className="stage-flow-modal-card">
        <header>
          <h2 id="stage-guide-title">이 활동은 이렇게 진행돼요</h2>
        </header>
        <div className="stage-flow-modal-body">
          <IntroText text={guide.intro} highlight={guide.highlight} />
          <ol className="stage-flow-guide-list">
            {guide.steps.map((step, i) => (
              <li key={step.title}>
                <span className="stage-flow-guide-num">{i + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="stage-flow-callout">
            <b>{guide.calloutTitle}</b>
            <br />
            {guide.calloutBody}
          </div>
          {guide.hint ? <p className="stage-flow-hint">{guide.hint}</p> : null}
        </div>
        <div className="stage-flow-modal-foot">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={onContinue}>
            {busy ? busyLabel ?? '준비 중…' : guide.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
