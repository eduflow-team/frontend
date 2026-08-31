import type { Stage4Report } from '../../../api/types';

const FIELDS: { key: keyof Stage4Report; label: string }[] = [
  { key: 'successful_attacks', label: '통한 공격' },
  { key: 'failed_attacks', label: '막힌 공격' },
  { key: 'why_breached', label: '왜 뚫렸나' },
  { key: 'defense_ideas', label: '어떻게 막으면 좋을까' },
];

interface Stage4ReportReviewProps {
  difficulty: string;
  report: Stage4Report;
}

export function Stage4ReportReview({ difficulty, report }: Stage4ReportReviewProps) {
  return (
    <section className="report-panel" style={{ marginTop: 18 }}>
      <h2>제출한 보고서 · {difficulty}</h2>
      <div className="stack">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="field-group">
            <p className="label">{label}</p>
            <div className="field report-readonly">{report[key]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
