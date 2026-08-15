import { useEffect, useState } from 'react';
import { learningModeByStage } from '../../../constants/navigation';
import {
  STAGE4_DEFAULT_ASSIGN,
  readStage4Assignment,
  saveStage4Assignment,
} from '../../../mocks/stage4Guard';

/** stage4_ui 교사 — 보안 과제 만들기 */
export function TeacherStage4Form() {
  const saved = readStage4Assignment();
  const [title, setTitle] = useState(saved.title);
  const [mission, setMission] = useState(saved.mission);
  const [secret, setSecret] = useState(saved.secret);
  const [attacker, setAttacker] = useState(saved.attacker);
  const [due, setDue] = useState(saved.due);
  const [hints, setHints] = useState([
    saved.hints[0] || STAGE4_DEFAULT_ASSIGN.hints[0],
    saved.hints[1] || STAGE4_DEFAULT_ASSIGN.hints[1],
    saved.hints[2] || STAGE4_DEFAULT_ASSIGN.hints[2],
  ]);
  const [created, setCreated] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const create = () => {
    saveStage4Assignment({
      title: title.trim() || STAGE4_DEFAULT_ASSIGN.title,
      mission: mission.trim() || STAGE4_DEFAULT_ASSIGN.mission,
      secret: secret.trim() || STAGE4_DEFAULT_ASSIGN.secret,
      attacker: attacker.trim() || STAGE4_DEFAULT_ASSIGN.attacker,
      due: due.trim(),
      hints: hints.map((h) => h.trim()).filter(Boolean),
    });
    setCreated(true);
    setToast('과제를 게시했습니다.');
  };

  return (
    <div className="s4">
      <div className="shell">
        <nav className="steps" aria-label="진행 단계">
          <div className="step" aria-current="step">
            과제 만들기
          </div>
          <div className="step">학생 학습</div>
          <div className="step">결과 확인</div>
        </nav>

        <h1 className="page-title">{learningModeByStage(4)?.module ?? '보안 강화'}</h1>
        <p className="page-desc">
          학생이 지켜야 할 비밀 키를 정하세요. AI가 프롬프트 인젝션으로 키를 물어보고, 학생은
          문지기로서 답에 키를 넣지 않아야 합니다.
        </p>

        <div className="stack">
          <div className="field-group">
            <label className="label" htmlFor="titleInput">
              과제 제목
            </label>
            <input
              id="titleInput"
              className="field"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="label" htmlFor="missionInput">
              학생 미션
            </label>
            <textarea
              id="missionInput"
              className="field"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
            />
            <p className="hint hint-sm">
              학생에게 보이는 안내입니다. “키를 찾아라”가 아니라 “키를 지켜라”로 적어 주세요.
            </p>
          </div>

          <div className="row-2">
            <div className="field-group">
              <label className="label" htmlFor="secretInput">
                숨겨진 비밀 키
              </label>
              <input
                id="secretInput"
                className="field"
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
              <p className="hint hint-sm">
                학생은 지키는 입장이라 이 키를 볼 수 있습니다. AI에게는 알려주지 마세요.
              </p>
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

          <div className="field-group">
            <label className="label" htmlFor="attackerInput">
              AI 공격자 설정
            </label>
            <textarea
              id="attackerInput"
              className="field"
              value={attacker}
              onChange={(e) => setAttacker(e.target.value)}
            />
          </div>

          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">난이도 · 순차 해금</p>
            </div>
            <p className="mission-text">
              학생은 <b>EASY</b>부터 시작합니다. 해당 난이도의 공격 프롬프트를 모두 막으면{' '}
              <b>NORMAL</b>, 이어서 <b>HARD</b>가 열립니다.
            </p>
            <div className="diff-preview">
              <div className="diff-card">
                <strong>EASY</strong>
                <span>직접 질문</span>
              </div>
              <div className="diff-card">
                <strong>NORMAL</strong>
                <span>역할극 · 지시 무시</span>
              </div>
              <div className="diff-card">
                <strong>HARD</strong>
                <span>JSON/YAML · 변형 출력</span>
              </div>
            </div>
          </section>

          <div className="field-group">
            <label className="label">방어 힌트 카드</label>
            <p className="hint hint-sm" style={{ marginBottom: 8 }}>
              학생이 막히면 쓸 수 있습니다. 사용하면 감점됩니다.
            </p>
            {hints.map((h, i) => (
              <input
                key={i}
                className="field"
                style={{ marginBottom: i < 2 ? 6 : 0 }}
                type="text"
                value={h}
                onChange={(e) => {
                  const next = [...hints];
                  next[i] = e.target.value;
                  setHints(next);
                }}
              />
            ))}
          </div>

          <section className="info-card">
            <div className="info-card-head">
              <span className="info-icon" aria-hidden="true">
                ◇
              </span>
              <p className="side-title">채점 방식</p>
            </div>
            <p className="mission-text">
              키를 답에 넣지 않고 막은 비율, 힌트를 적게 쓴 정도, 보고서(왜 위험한지 · 어떻게 막을지)를
              함께 봅니다.
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
                <p className="side-title">게시 완료</p>
              </div>
              <p className="mission-text">
                과제를 게시했습니다. 같은 브라우저의 학생 보안 강화 화면에서 방어 활동을 확인할 수
                있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
