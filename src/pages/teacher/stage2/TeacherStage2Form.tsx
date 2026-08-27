import { useEffect, useState } from 'react';
import {
  ApiError,
  createTeacherAssignmentStep2Api,
  createTeacherAssignmentStep2SetApi,
  fetchTeacherAssignmentStep2SetApi,
  publishTeacherAssignmentStep2SetApi,
} from '../../../api';
import type { Stage2CreateResponse, Stage2SetCardPreview } from '../../../api/types';
import { HALLUCINATION_LABELS, SUBJECT_OPTIONS } from '../../../constants/assignments';
import { learningModeByStage } from '../../../constants/navigation';
import { defaultDueAtLocal, localDateTimeToIso } from '../../../utils/datetime';

const HALLUCINATION_OPTIONS = [
  { value: 'RETRIEVAL_ERROR', label: '잘못된 문서 검색', defaultOn: true },
  { value: 'PERSONA_BIAS', label: '페르소나 편향', defaultOn: false },
  { value: 'INFORMATION_FABRICATION', label: '정보 날조', defaultOn: false },
] as const;

const STEP_LABELS = ['참고 문서', 'AI 페르소나', '환각 유형', '학생 질문', '후보 개수'];

const REFERENCE_ACCEPT = '.pdf,.txt,.md,.markdown';

function StepIndicator({
  currentStep,
  previewing,
  accepted,
}: {
  currentStep: number;
  previewing: boolean;
  accepted: boolean;
}) {
  const active = previewing || accepted ? 6 : currentStep;
  return (
    <div className="teacher-steps">
      {STEP_LABELS.map((label, index) => {
        const n = index + 1;
        const done = n < active;
        const isActive = n === active;
        return (
          <div key={label} className="teacher-step-row">
            <div className="teacher-step-item">
              <span className={`teacher-step-circle${done ? ' done' : ''}${isActive ? ' active' : ''}`}>
                {done ? '✓' : n}
              </span>
              <span className={`teacher-step-label${isActive ? ' active' : ''}`}>{label}</span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div className={`teacher-step-line${n < active ? ' done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function selectSuccessfulCards(cards: Stage2SetCardPreview[]) {
  return cards
    .filter((card) => card.generation_succeeded && card.assignment_id != null)
    .map((card) => card.assignment_id as number);
}

function previewSnippet(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}
    try {
      // 제목은 학생 화면 헤더에 노출되므로 질문 문장을 그대로 쓰지 않는다
      const subjectLabel = SUBJECT_OPTIONS.find((s) => s.value === subject)?.label ?? '';
      const title = `${subjectLabel ? `${subjectLabel} · ` : ''}Hallucination 탐지`;
      const base = {
        title,
        subject,
        question: question.trim(),
        persona: persona.trim().slice(0, 100),
        due_at: localDateTimeToIso(defaultDueAtLocal()),
        hallucination_types: [...hallucinationTypes],
        file: referenceFile,
      };

      if (cardCount === 1) {
        const res = await createTeacherAssignmentStep2Api({
          ...base,
          expected_error_count: 1,
        });
        const card = singleCreateToCard(res);
        setPreviewCards([card]);
        setSelectedIds([res.assignment_id]);
        setPublishedIds([res.assignment_id]);
        setAccepted(true);
      } else {
        const res = await createTeacherAssignmentStep2SetApi({
          ...base,
          card_count: cardCount,
        });
        setSetId(res.set_id);
        setPreviewCards(res.cards);
        setSelectedIds(selectSuccessfulCards(res.cards));
        if (selectSuccessfulCards(res.cards).length === 0) {
          setError('생성에 성공한 후보가 없습니다. 다시 시도해 주세요.');
        }
      }
      setPreviewing(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI 답변 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidate = (assignmentId: number) => {
    setSelectedIds((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId],
    );
  };

  const handleCandidateGridClick = (
    index: number,
    assignmentId: number | null | undefined,
    failed: boolean,
  ) => {
    if (failed) return;
    setPreviewIndex(index);
    setShowErrorDetails(false);
    if (setId != null && assignmentId != null) {
      toggleCandidate(assignmentId);
    }
  };

  const focusedCard = previewCards[previewIndex] ?? previewCards[0];
            {error && <p className="form-error">{error}</p>}
            <div className="teacher-actions">
              <button type="button" className="btn btn-ghost" onClick={resetWizard}>
                다시 생성
              </button>
              {setId != null && (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => void refreshPreview()}>
                    미리보기 새로고침
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={publishing || selectedIds.length === 0}
                    onClick={() => void publishSelected()}
                  >
                    {publishing ? '게시 중…' : `선택한 ${selectedIds.length}개 게시`}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 1 · 5</span>
                  <label htmlFor="teacher-doc-file">참고 문서</label>
                  <div className="teacher-file-upload">
                    <input
                      id="teacher-doc-file"
                      key={fileInputKey}
                      type="file"
                      accept={REFERENCE_ACCEPT}
                      className="teacher-file-input"
                      onChange={(e) => {
                        setReferenceFile(e.target.files?.[0] ?? null);
                        setError('');
                      }}
                    />
                    <div className="teacher-file-drop">
                      <p className="teacher-file-title">PDF 교과 자료를 업로드하세요</p>
                      <p className="teacher-file-hint">PDF 권장 · TXT·MD도 가능</p>
                      <label htmlFor="teacher-doc-file" className="btn btn-ghost btn-sm teacher-file-btn">
                        파일 선택
                      </label>
                    </div>
                    {referenceFile && (
                      <div className="teacher-file-selected">
                        <strong>{referenceFile.name}</strong>
                        <span>{(referenceFile.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          className="teacher-file-remove"
                          onClick={() => {
                            setReferenceFile(null);
                            setFileInputKey((k) => k + 1);
                          }}
                        >
                          제거
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <aside className="teacher-aside">
                  <strong>좋은 참고 문서 조건</strong>
                  <ul>
                    <li>교과 PDF·발췌본을 업로드하세요</li>
                    <li>구체적 사실과 연도가 포함되면 좋아요</li>
                    <li>학생이 이미 배운 범위여야 해요</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 2 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 2 · 5</span>
                  <label htmlFor="teacher-persona">AI 페르소나 (최대 100자)</label>
                  <input
                    id="teacher-persona"
                    value={persona}
                    maxLength={100}
                    onChange={(e) => setPersona(e.target.value)}
                    placeholder="예: 장영실이 연을 만들었다고 믿는 한국사 선생님"
                  />
                </div>
                <aside className="teacher-aside">
                  <strong>페르소나 작성 가이드</strong>
                  <ul>
                    <li>과목·인물 특성을 구체적으로 적어주세요</li>
                    <li>&quot;~라고 믿는&quot; 형태가 오류 유도에 효과적이에요</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 3 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 3 · 5</span>
                  <span className="field-label">환각 유형 (중복 선택 가능)</span>
                  <div className="teacher-checklist">
                    {HALLUCINATION_OPTIONS.map((opt, index) => (
                      <label
                        key={opt.value}
                        className={`teacher-check-item${hallucFlags[index] ? ' checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={hallucFlags[index]}
                          onChange={() => toggleHalluc(index)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <aside className="teacher-aside">
                  <strong>환각 유형 예시</strong>
                  <ul>
                    <li>잘못된 문서 검색 — 관련 없는 문서에서 근거를 가져옴</li>
                    <li>페르소나 편향 — 페르소나 설정 때문에 사실 왜곡</li>
                    <li>정보 날조 — 문서에 없는 내용을 새로 만들어냄</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 4 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 4 · 5</span>
                  <label htmlFor="teacher-question">학생에게 제공할 질문</label>
                  <textarea
                    id="teacher-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={6}
                    placeholder="예: 개항 이후 동아시아 정세 변화를 설명해 주세요."
                  />
                </div>
                <aside className="teacher-aside">
                  <strong>질문 작성 가이드</strong>
                  <ul>
                    <li>교과서 범위를 벗어나지 않게 질문하세요</li>
                    <li>서술형으로 답을 유도하는 질문이 좋아요</li>
                  </ul>
                </aside>
              </div>
            )}

            {step === 5 && (
              <div className="teacher-grid">
                <div className="teacher-card">
                  <span className="teacher-step-badge">STEP 5 · 5</span>
                  <label htmlFor="candidate-count">후보 카드 개수 (최대 3개)</label>
                  <select
                    id="candidate-count"
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}개
                      </option>
                    ))}
                  </select>
                  <p className="field-hint">
                    후보를 여러 개 만들면 미리보기에서 선택한 카드만 게시합니다. 카드마다 환각은 1개입니다.
                  </p>
                </div>
                <aside className="teacher-aside">
                  <strong>생성 안내</strong>
                  <ul>
                    <li>1개면 바로 게시됩니다</li>
                    <li>2개 이상이면 미리보기 후 선택 게시합니다</li>
                  </ul>
                </aside>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}

            <div className="teacher-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={step === 1 || loading}
                onClick={() => setStep((s) => s - 1)}
              >
                이전
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={handleNext}
              >
                {loading ? '생성 중…' : step < 5 ? '다음' : 'AI 후보 생성'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
