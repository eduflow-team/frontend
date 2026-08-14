import { useEffect, useState } from 'react';
import {
  STAGE3_SAMPLE,
  readStage3Assignment,
  saveStage3Assignment,
} from '../../../mocks/stage3Debate';

/** stage3_ui 교사 출제 화면 */
export function TeacherStage3Form() {
  const saved = readStage3Assignment();
  const [topic, setTopic] = useState(saved?.topic || STAGE3_SAMPLE.topic);
  const [proPersona, setProPersona] = useState(saved?.proPersona || STAGE3_SAMPLE.pro.role);
  const [conPersona, setConPersona] = useState(saved?.conPersona || STAGE3_SAMPLE.con.role);
  const [due, setDue] = useState('2026. 8. 21. 23:59');
  const [created, setCreated] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const create = () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      setToast('토론 주제를 입력해 주세요.');
      return;
    }
    saveStage3Assignment({
      topic: trimmed,
      proPersona: proPersona.trim(),
      conPersona: conPersona.trim(),
    });
    setCreated(true);
    setToast('과제를 만들었습니다. 학생 화면에서 토론이 시작됩니다.');
  };

  return (
    <div className="s3">
      <div className="shell">
        <nav className="steps" aria-label="진행 단계">
          <div className="step" aria-current="step">
            과제 만들기
          </div>
          <div className="step">학생 토론 평가</div>
          <div className="step">결과 확인</div>
        </nav>

        <h1 className="page-title">토론 과제 만들기</h1>
        <p className="page-desc">
          주제와 양측 페르소나를 정하면 찬성·반대 AI가 번갈아 토론합니다. 학생은 평가자로 참여합니다.
        </p>

        <div className="stack">
          <div className="field-group">
            <label className="label" htmlFor="topicInput">
              토론 주제
            </label>
            <input
              id="topicInput"
              className="field"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <p className="hint hint-sm">찬반이 갈리는 주제일수록 근거 비교가 잘 드러납니다.</p>
          </div>

          <div className="row-2">
            <div className="field-group">
              <label className="label" htmlFor="proPersona">
                찬성 측 페르소나
              </label>
              <textarea
                id="proPersona"
                className="field"
                value={proPersona}
                onChange={(e) => setProPersona(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="label" htmlFor="conPersona">
                반대 측 페르소나
              </label>
              <textarea
                id="conPersona"
                className="field"
                value={conPersona}
                onChange={(e) => setConPersona(e.target.value)}
              />
            </div>
          </div>

          <div className="row-2">
            <div className="field-group">
              <label className="label">토론 구조</label>
              <div className="info-card" style={{ padding: '12px 14px' }}>
                <p className="mission-text" style={{ fontSize: 14 }}>
                  찬성 주장 → 반대 반박 → 찬성 재반박 · Langflow v2
                </p>
              </div>
            </div>
            <div className="field-group">
              <label className="label" htmlFor="dueInput">
                마감
              </label>
              <input
                id="dueInput"
                className="field"
                type="text"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>

          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">채점 방식</p>
            </div>
            <p className="mission-text">
              학생 점수는 토론의 승패가 아니라 <b>팩트체커를 적절한 순간에 썼는지</b>로 매겨집니다.
              과장·허위 근거를 검증 없이 넘기면 감점되고, 근거가 탄탄한 발언까지 검증해도 감점됩니다.
            </p>
            <p className="hint hint-sm" style={{ marginTop: 10 }}>
              찬성·반대 AI는 설득을 위해 과장된 수치를 섞도록 설계되어 있습니다.
            </p>
          </section>

          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={create}>
              과제 만들기
            </button>
          </div>

          {created && (
            <div className="info-card">
              <div className="info-card-head">
                <span className="info-icon" aria-hidden="true">
                  ✓
                </span>
                <p className="side-title">배포 완료</p>
              </div>
              <p className="mission-text">
                주제를 저장했습니다. 같은 브라우저의 학생 2단계·3단계 화면에서 토론을 시작할 수
                있습니다. (Langflow 서버가 없으면 샘플 토론으로 진행됩니다.)
              </p>
            </div>
          )}
        </div>
      </div>
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
