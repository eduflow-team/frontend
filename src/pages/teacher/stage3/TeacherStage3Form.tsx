import { useEffect, useState } from 'react';
import {
  ApiError,
  createTeacherAssignmentStep3Api,
  fetchClassesApi,
} from '../../../api';
import type { ClassItem } from '../../../api/types';
import { SUBJECT_OPTIONS } from '../../../constants/assignments';
import { learningModeByStage } from '../../../constants/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { defaultDueAtLocal, formatDueAt, localDateTimeToIso } from '../../../utils/datetime';
import { formatClassLabel } from '../../../utils/labels';

/** stage3_ui 교사 출제 화면 — POST /teacher/assignments/step3 */
export function TeacherStage3Form() {
  const { user } = useAuth();
  const useApi = Boolean(user && !user.isDemo);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [subject, setSubject] = useState<string>(SUBJECT_OPTIONS[0]?.value ?? '');
  const [topic, setTopic] = useState('');
  const [proPersona, setProPersona] = useState('');
  const [conPersona, setConPersona] = useState('');
  const [dueAt, setDueAt] = useState(defaultDueAtLocal());
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!useApi) return;
    fetchClassesApi()
      .then((res) => {
        setClasses(res.classes);
        const firstClass = res.classes[0];
        if (firstClass) setClassId(firstClass.class_id);
      })
      .catch(() => setClasses([]));
  }, [useApi]);

  const create = async () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError('토론 주제를 입력해 주세요.');
      setToast('토론 주제를 입력해 주세요.');
      return;
    }
    const pro = proPersona.trim().slice(0, 100);
    const con = conPersona.trim().slice(0, 100);
    if (!pro || !con) {
      setError('찬성·반대 페르소나를 입력해 주세요.');
      return;
    }

    setError('');
    if (!useApi) {
      setError('데모 계정에서는 과제를 게시할 수 없습니다. 실제 계정으로 로그인해 주세요.');
      return;
    }

    if (classId === '') {
      setError('학급을 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createTeacherAssignmentStep3Api({
        class_id: Number(classId),
        topic: trimmed,
        pro_persona: pro,
        con_persona: con,
        title: trimmed.slice(0, 48),
        subject,
        due_at: dueAt ? localDateTimeToIso(dueAt) : undefined,
      });
      setCreatedId(res.assignment_id);
      setToast('과제를 게시했습니다.');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.message.includes('권한'))) {
        setError('선택한 학급에 출제 권한이 없습니다. 담당 학급을 골라 주세요.');
      } else {
        setError(err instanceof ApiError ? err.message : '과제 게시에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="s3">
      <div className="shell">
        <nav className="steps" aria-label="진행 단계">
          <div className="step" aria-current="step">
            과제 만들기
          </div>
          <div className="step">학생 학습</div>
          <div className="step">결과 확인</div>
        </nav>

        <h1 className="page-title">{learningModeByStage(3)?.module ?? 'AI 토론'}</h1>
        <p className="page-desc">
          주제와 양측 페르소나를 정하면 찬성·반대 AI가 번갈아 토론합니다. 학생은 평가자로 참여합니다.
        </p>

        <div className="stack">
          {useApi && (
            <div className="row-2">
              <div className="field-group">
                <label className="label" htmlFor="s3-class">
                  학급
                </label>
                <select
                  id="s3-class"
                  className="field"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting || createdId != null}
                >
                  <option value="">학급 선택</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {formatClassLabel(c.grade, c.class_number)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="label" htmlFor="s3-subject">
                  담당 교과
                </label>
                <select
                  id="s3-subject"
                  className="field"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting || createdId != null}
                >
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="field-group">
            <label className="label" htmlFor="topicInput">
              토론 주제
            </label>
            <input
              id="topicInput"
              className="field"
              type="text"
              placeholder="예: 학교에 AI 시험 감독 시스템을 도입해야 하는가?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={submitting}
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
                maxLength={100}
                placeholder="예: 효율성을 중시하는 교육 전문가"
                value={proPersona}
                onChange={(e) => setProPersona(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field-group">
              <label className="label" htmlFor="conPersona">
                반대 측 페르소나
              </label>
              <textarea
                id="conPersona"
                className="field"
                maxLength={100}
                placeholder="예: 개인정보를 우려하는 인권 전문가"
                value={conPersona}
                onChange={(e) => setConPersona(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="field-group" style={{ maxWidth: 320 }}>
            <label className="label" htmlFor="dueInput">
              마감
            </label>
            <input
              id="dueInput"
              className="field"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={submitting}
            />
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

          {error ? <p className="hint" style={{ color: '#b91c1c' }}>{error}</p> : null}

          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={() => void create()} disabled={submitting}>
              {submitting ? '게시 중…' : '과제 만들기'}
            </button>
          </div>

          {createdId != null && (
            <div className="info-card">
              <div className="info-card-head">
                <span className="info-icon" aria-hidden="true">
                  ✓
                </span>
                <p className="side-title">게시 완료</p>
              </div>
              <p className="mission-text">
                {`과제를 게시했습니다. 과제 ID: ${createdId}${dueAt ? ` · 마감 ${formatDueAt(localDateTimeToIso(dueAt))}` : ''}`}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
