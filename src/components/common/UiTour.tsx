import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';

export interface UiTourStep {
  target: string;
  title: string;
  body: string;
  placement?: 'right' | 'left' | 'bottom' | 'top';
}

interface UiTourProps {
  open: boolean;
  steps: UiTourStep[];
  onFinish: () => void;
  finishLabel?: string;
  ariaLabel?: string;
}

const PAD = 8;

function spotlightClipPath(rect: DOMRect, pad: number): string {
  const l = Math.max(0, rect.left - pad);
  const t = Math.max(0, rect.top - pad);
  const r = rect.right + pad;
  const b = rect.bottom + pad;
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px)`;
}

export function UiTour({
  open,
  steps,
  onFinish,
  finishLabel = '시작하기',
  ariaLabel = '화면 안내',
}: UiTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const target = steps[step]?.target;
    if (!target) return;

    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('s1-tour-active');

    const update = () => {
      setRect(el.getBoundingClientRect());
    };
    update();
    const t = window.setTimeout(update, 320);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      el.classList.remove('s1-tour-active');
      window.clearTimeout(t);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, step, steps]);

  if (!open || steps.length === 0) return null;

  const current = steps[step];
  if (!current) return null;

  const isLast = step >= steps.length - 1;
  const bubbleStyle = positionBubble(rect, current.placement ?? 'bottom');

  return (
    <div className="s1-tour" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      {rect ? (
        <>
          <div
            className="s1-tour-dim s1-tour-dim-cutout"
            style={{ clipPath: spotlightClipPath(rect, PAD) }}
          />
          <div
            className="s1-tour-spot"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
          />
        </>
      ) : (
        <div className="s1-tour-dim" />
      )}
      <div className="s1-tour-bubble" style={bubbleStyle}>
        <p className="s1-tour-step">
          {step + 1} / {steps.length}
        </p>
        <strong className="s1-tour-title">{current.title}</strong>
        <p className="s1-tour-body">{current.body}</p>
        <div className="s1-tour-actions">
          <button type="button" className="btn btn-ghost btn-small" onClick={onFinish}>
            건너뛰기
          </button>
          {isLast ? (
            <button type="button" className="btn btn-primary btn-small" onClick={onFinish}>
              {finishLabel}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => setStep((s) => s + 1)}
            >
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function positionBubble(
  rect: DOMRect | null,
  placement: 'right' | 'left' | 'bottom' | 'top',
): CSSProperties {
  const gap = 14;
  const width = Math.min(320, window.innerWidth - 24);
  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      width,
      transform: 'translate(-50%, -50%)',
    };
  }

  if (placement === 'right') {
    const left = Math.min(rect.right + gap, window.innerWidth - width - 12);
    const top = Math.min(Math.max(12, rect.top), window.innerHeight - 220);
    return { top, left, width };
  }
  if (placement === 'left') {
    const left = Math.max(12, rect.left - width - gap);
    const top = Math.min(Math.max(12, rect.top), window.innerHeight - 220);
    return { top, left, width };
  }
  if (placement === 'top') {
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12,
    );
    const top = Math.max(12, rect.top - gap - 160);
    return { top, left, width };
  }
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - 12,
  );
  const top = Math.min(rect.bottom + gap, window.innerHeight - 200);
  return { top, left, width };
}
