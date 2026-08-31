import { HALLUCINATION_TYPE_GUIDE } from '../../../constants/stage2StudentGuide';
import type { VerifyPhase } from '../../../types/stage2';

const PHASE_STEPS: Record<VerifyPhase, { title: string; body: string }[]> = {
  find: [
    { title: 'PDF 확인', body: '교과 PDF 원문에서 AI 질문과 관련된 부분을 읽습니다.' },
    { title: '오류 선택', body: 'AI 답변에서 PDF와 다른 문장을 드래그하거나 클릭합니다.' },
    { title: '유형 · 근거', body: '환각 유형을 고르고 PDF 근거와 함께 이유를 씁니다.' },
    { title: '제출', body: '제출 후 피드백을 보고, 맞으면 교정 단계로 넘어갑니다.' },
  ],
  correct: [
    { title: '오류 확인', body: '찾아 둔 오류 문장을 다시 읽어 봅니다.' },
    { title: '문장 교정', body: '교과 PDF에 맞는 올바른 문장으로 고칩니다.' },
    { title: '최종 제출', body: '교정은 1회만 가능합니다.' },
  ],
  done: [{ title: '완료', body: '탐지와 교정이 끝났습니다.' }],
};

export function Stage2HelpGuide({  open,
  onClose,
  phase,
}: {
  open: boolean;
  onClose: () => void;
  phase: VerifyPhase;
}) {
  if (!open) return null;
  return (
    <div
      className="modal open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>풀이 방법 · 환각 유형</h2>
          <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="modal-body">
          <p className="hint" style={{ marginBottom: 14 }}>
            지금 단계에서 이렇게 진행하세요.
          </p>
          <GuideStepList steps={PHASE_STEPS[phase]} />
          <p className="hint hint-sm" style={{ margin: '18px 0 10px' }}>
            환각 유형 3가지
          </p>
          <ul className="hint-list">
            {HALLUCINATION_TYPE_GUIDE.map((item) => (
              <li key={item.value}>
                <strong>{item.label}</strong> — {item.summary}
              </li>
            ))}
          </ul>
          <div className="callout">
            <b>사유 작성 팁</b>
            <br />
            「교과 자료에는 …라고 되어 있는데, AI는 …라고 해서 틀렸다」처럼 근거를 구체적으로
            쓰세요.
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideStepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="guide-list">
      {steps.map((step, i) => (
        <li key={step.title}>
          <span className="guide-num">{i + 1}</span>
          <div>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const RUBRIC_GUIDE = [
  {
    title: '근거 인용',
    body: '하이라이트한 이유에 교과 근거를 구체적으로 썼는지 봅니다.',
  },
  {
    title: '오류 식별',
    body: '고른 환각 유형(페르소나 편향 · 정보 날조 · 잘못된 문서 검색)이 맞는지 봅니다.',
  },
  {
    title: '재서술',
    body: '교정 단계에서 PDF에 맞게 고친 문장이 올바른지 봅니다.',
  },
] as const;

export function Stage2RubricGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="modal open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>채점 · 진행</h2>
          <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="modal-body">
          <p className="hint" style={{ marginBottom: 14 }}>
            탐지·교정 제출 때마다 아래 세 가지를 채점합니다.
          </p>
          <GuideStepList steps={[...RUBRIC_GUIDE]} />
          <div className="callout" style={{ marginTop: 16 }}>
            <b>표시 기호</b>
            <br />
            ✓ 통과 · △ 부분 또는 미달 · — 아직 해당 없음
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
