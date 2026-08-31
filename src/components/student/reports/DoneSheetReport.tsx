import type { ReactNode } from 'react';

export function DoneSheetReport({
  scoreLabel = '최종 점수',
  score,
  meta,
  children,
}: {
  scoreLabel?: string;
  score: number;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="s1">
      <section className="done-layout">
        <article className="done-sheet">
          <header className="done-sheet-score">
            <p className="done-sheet-label">{scoreLabel}</p>
            <p className="done-sheet-points">
              <strong>{score}</strong>
              <span>점</span>
            </p>
            {meta ? <div className="done-sheet-meta">{meta}</div> : null}
          </header>
          <div className="done-sheet-body">{children}</div>
        </article>
      </section>
    </div>
  );
}

export function DoneSheetBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="done-sheet-block">
      <p className="done-sheet-kicker">{label}</p>
      {children}
    </div>
  );
}

export function DoneSheetMetaTag({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: 'ok' | 'bad';
}) {
  return <span className={tone === 'ok' ? 'is-ok' : tone === 'bad' ? 'is-bad' : undefined}>{children}</span>;
}
