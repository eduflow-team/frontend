import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, createTeacherAssignmentStep1Api, createTeacherAssignmentStep2Api } from '../../api';
import { PageHero, PlaceholderCard } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

const STAGE_DESCRIPTIONS: Record<string, string> = {
  '1': 'Temperature, Chunk Size 등 AI 파라미터 과제를 출제합니다.',
  '2': 'AI 환각(Hallucination) 탐지 과제를 구성합니다.',
  '3': 'AI 관점 비교 토론 주제를 설정합니다.',
  '4': 'AI 보안 실습 시나리오를 배포합니다.',
};

export function TeacherStagePage() {
  const { stage } = useParams<{ stage: string }>();
  const stageNum = stage ?? '1';
  const { user } = useAuth();
  const useApi = user && !user.isDemo && (stageNum === '1' || stageNum === '2');

  const [title, setTitle] = useState(
    stageNum === '1'
      ? '조선 시대 장영실의 과학 기술 업적'
      : 'AI가 틀린 역사 답변 찾기',
  );
  const [material, setMaterial] = useState('');
  const [promptOrAnswer, setPromptOrAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!useApi) {
    return (
      <>
        <PageHero
          title={`${stageNum}단계 과제 출제`}
          description={STAGE_DESCRIPTIONS[stageNum] ?? ''}
        />
        <PlaceholderCard
          title={`${stageNum}단계 과제 편집 영역`}
          message={
            stageNum === '3' || stageNum === '4'
              ? '3·4단계 API는 백엔드에 아직 없습니다.'
              : '데모 모드에서는 과제 업로드 API를 호출하지 않습니다.'
          }
        />
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!title.trim()) {
      setError('주제(제목)를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    const body = {
      title: title.trim(),
      material: material.trim(),
      content: promptOrAnswer.trim(),
    };
    try {
      const res =
        stageNum === '1'
          ? await createTeacherAssignmentStep1Api(body)
          : await createTeacherAssignmentStep2Api(body);
      setMessage(
        res.status === 'success'
          ? '과제가 업로드되었습니다. (백엔드 스텁 응답)'
          : '요청이 완료되었습니다.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        title={`${stageNum}단계 과제 출제`}
        description={STAGE_DESCRIPTIONS[stageNum]}
      />
      <div className="card">
        <div className="card-header">
          <span className="card-title">{stageNum === '1' ? '1단계 · 답 실험' : '2단계 · 틀린 말 찾기'}</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="stage-title">
                주제
              </label>
              <input
                id="stage-title"
                className="form-control"
                style={{ fontSize: 16, fontWeight: 600 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="stage-material">
                학습 자료 / 참고 문장
              </label>
              <textarea
                id="stage-material"
                className="form-control"
                rows={4}
                placeholder="학생에게 보여줄 자료나 참고 문장을 입력하세요"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="stage-content">
                {stageNum === '1' ? 'AI 예시 답변 / 안내' : '탐지할 문장 · 정답 가이드'}
              </label>
              <textarea
                id="stage-content"
                className="form-control"
                rows={5}
                value={promptOrAnswer}
                onChange={(e) => setPromptOrAnswer(e.target.value)}
              />
            </div>
            {error && <p className="inline-alert error">{error}</p>}
            {message && <p className="inline-alert ok">{message}</p>}
            <button type="submit" className="btn btn-primary btn-cta" disabled={submitting}>
              {submitting ? '업로드 중…' : '업로드하기'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
