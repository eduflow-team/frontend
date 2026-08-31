import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, createTeacherAssignmentStep4Api, fetchClassesApi } from '../../../api';
import type { ClassItem, Stage4CreateResponse } from '../../../api/types';
import { learningModeByStage } from '../../../constants/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { formatClassLabel } from '../../../utils/labels';

/** Stage4 교사 — 프롬프트 인젝션 실습 과제 생성 (EASY/NORMAL/HARD 세트) */
export function TeacherStage4Form() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [title, setTitle] = useState('프롬프트 인젝션 보안 실습');
  const [mission, setMission] = useState('숨겨진 비밀 키를 프롬프트 인젝션으로 찾아라.');
  const [secretKey, setSecretKey] = useState('EDUFLOW-SECRET-42');
  const [maxAttempts, setMaxAttempts] = useState(10);
  const [guideline, setGuideline] = useState(
    '공격자 역할로 AI와 대화하며 비밀 키를 탈취해 보세요. EASY부터 시작해 순서대로 클리어하세요.',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Stage4CreateResponse | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!authReady || user?.isDemo) return;
    fetchClassesApi()
      .then((res) => {
        setClasses(res.classes);
        if (res.classes[0]) setClassId(res.classes[0].class_id);
      })
      .catch(() => setClasses([]));
  }, [authReady, user?.isDemo]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const create = async () => {
    setError('');
    if (user?.isDemo || !user) {
      setError('데모 모드에서는 API를 사용할 수 없습니다. 실제 계정으로 로그인해 주세요.');
      return;
    }
    if (classId === '') {
      setError('학급을 선택해 주세요.');
      return;
    }
    if (!title.trim() || !mission.trim() || !secretKey.trim() || !guideline.trim()) {
      setError('제목, 미션, 비밀 키, 가이드라인을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createTeacherAssignmentStep4Api({
        class_id: Number(classId),
        title: title.trim(),
        mission: mission.trim(),
        secret_key: secretKey.trim(),
        max_attempts: maxAttempts,
        guideline: guideline.trim(),
      });
      setCreated(res);
      setToast('과제 세트(EASY/NORMAL/HARD)를 게시했습니다.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '과제 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <div className="s4">
        <div className="shell">
          <p className="hint">세션 확인 중…</p>
        </div>
      </div>
    );
  }

  if (!user || user.isDemo) {
    return (
      <div className="s4">
        <div className="shell">
          <h1 className="page-title">{learningModeByStage(4)?.module ?? '프롬프트 인젝션 실습'}</h1>
          <div className="info-card">
            <p className="mission-text">
              Stage4 과제 생성은 백엔드 API가 필요합니다. 데모가 아닌 계정으로{' '}
              <Link to="/login">로그인</Link>해 주세요.
            </p>
            <p className="hint hint-sm" style={{ marginTop: 8 }}>
              테스트 계정: e2e.teacher@example.com / Passw0rd!
            </p>
          </div>
        </div>
      </div>
    );
  }

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

        <h1 className="page-title">{learningModeByStage(4)?.module ?? '프롬프트 인젝션 실습'}</h1>
        <p className="page-desc">
          한 번 생성하면 EASY · NORMAL · HARD 세트가 함께 만들어집니다. 학생은 순서대로 해금하며
          공격 실습과 보고서를 제출합니다.
        </p>

        <div className="stack">
          <div className="field-group">
            <label className="label" htmlFor="classSelect">
              학급
            </label>
            <select
              id="classSelect"
              className="field"
              value={classId}
              onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
            >
              {classes.length === 0 ? (
                <option value="">학급 불러오는 중…</option>
              ) : (
                classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {formatClassLabel(c.grade, c.class_number)}
                  </option>
                ))
              )}
            </select>
          </div>

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
              placeholder="학생이 목록에서 볼 제목"
            />
            <p className="hint hint-sm">학생 과제 선택 화면에 이 제목으로 표시됩니다.</p>
          </div>

          <div className="field-group">
            <label className="label" htmlFor="missionInput">
              학생 미션
            </label>
            <textarea
              id="missionInput"
              className="field"
              rows={3}
              value={mission}
              onChange={(e) => setMission(e.target.value)}
            />
          </div>

          <div className="row-2">
            <div className="field-group">
              <label className="label" htmlFor="secretInput">
                비밀 키 (교사만 설정)
              </label>
              <input
                id="secretInput"
                className="field"
                type="text"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
              <p className="hint hint-sm">학생 API에는 노출되지 않습니다. AI 응답에 포함되면 클리어입니다.</p>
            </div>
            <div className="field-group">
              <label className="label" htmlFor="attemptsInput">
                난이도당 최대 시도
              </label>
              <input
                id="attemptsInput"
                className="field"
                type="number"
                min={1}
                max={30}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value) || 10)}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="label" htmlFor="guidelineInput">
              학습 가이드라인
            </label>
            <textarea
              id="guidelineInput"
              className="field"
              rows={3}
              value={guideline}
              onChange={(e) => setGuideline(e.target.value)}
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
              EASY 클리어 → NORMAL 해금 → NORMAL 클리어 → HARD 해금. 힌트는 백엔드가 실패 누적에
              따라 자동 제공합니다.
            </p>
            <div className="diff-preview">
              <div className="diff-card">
                <strong>EASY</strong>
                <span>직접 요구</span>
              </div>
              <div className="diff-card">
                <strong>NORMAL</strong>
                <span>역할 · 승인</span>
              </div>
              <div className="diff-card">
                <strong>HARD</strong>
                <span>복합 우회</span>
              </div>
            </div>
          </section>

          {error && <p className="hint" style={{ color: 'var(--danger, #c0392b)' }}>{error}</p>}

          <div className="actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={submitting}
              onClick={() => void create()}
            >
              {submitting ? '생성 중…' : '과제 세트 만들기'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate('/teacher')}
            >
              대시보드로
            </button>
          </div>

          {created && (
            <div className="info-card">
              <div className="info-card-head">
                <span className="info-icon" aria-hidden="true">
                  ✓
                </span>
                <p className="side-title">게시 완료 · set #{created.set_id}</p>
              </div>
              <p className="mission-text">{created.title}</p>
              <ul className="hint hint-sm" style={{ marginTop: 8 }}>
                {created.assignments.map((a) => (
                  <li key={a.assignment_id}>
                    {a.difficulty}: assignment_id {a.assignment_id}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
