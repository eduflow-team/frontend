export type WorkflowStepState = 'pending' | 'active' | 'done';

export type WorkflowStep = {
  id: string;
  label: string;
  state: WorkflowStepState;
};

export function buildStage2WorkflowSteps(params: {
  phase: 'find' | 'correct' | 'done';
  highlightDone: boolean;
}): WorkflowStep[] {
  const { phase, highlightDone } = params;

  const steps: WorkflowStep[] = [
    { id: 'find', label: '탐지', state: 'pending' },
    { id: 'correct', label: '교정', state: 'pending' },
    { id: 'result', label: '결과', state: 'pending' },
  ];

  if (phase === 'done') {
    return steps.map((step) => ({ ...step, state: 'done' }));
  }

  if (phase === 'correct' || highlightDone) {
    steps[0].state = 'done';
    steps[1].state = 'active';
    steps[2].state = 'pending';
    return steps;
  }

  steps[0].state = 'active';
  return steps;
}

export function Stage2WorkflowSteps({ steps }: { steps: WorkflowStep[] }) {
  return (
    <section className="info-card info-card-workflow" data-tour="s2-tour-workflow">
      <div className="info-card-head">
        <span className="info-icon" aria-hidden="true">
          ◎
        </span>
        <p className="side-title">풀이 진행</p>
      </div>
      <ol className="workflow-steps" aria-label="풀이 진행 단계">
        {steps.map((step, index) => (
          <li key={step.id} className={`workflow-step is-${step.state}`}>
            <span className="workflow-step-marker" aria-hidden="true">
              {step.state === 'done' ? '✓' : index + 1}
            </span>
            <span className="workflow-step-label">{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
