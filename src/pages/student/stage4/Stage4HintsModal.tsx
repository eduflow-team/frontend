import type { Stage4Difficulty, Stage4DifficultyHints, Stage4HintItem } from '../../../api/types';
import {
  Stage4HintGroups,
  Stage4HintsList,
  countUnlockedHintGroups,
  countUnlockedHints,
} from './Stage4HintsList';

interface Stage4HintsModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  hints?: Stage4HintItem[];
  difficulty?: Stage4Difficulty;
  difficultyHints?: Stage4DifficultyHints[];
}

export function Stage4HintsModal({
  open,
  onClose,
  title = '힌트 목록',
  subtitle,
  hints,
  difficulty,
  difficultyHints,
}: Stage4HintsModalProps) {
  if (!open) return null;

  const unlockedCount = difficultyHints
    ? countUnlockedHintGroups(difficultyHints)
    : countUnlockedHints(hints ?? []);

  return (
    <div
      className="modal open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage4-hints-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <header>
          <h2 id="stage4-hints-title">{title}</h2>
          <button className="btn btn-ghost btn-small" type="button" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="modal-body">
          <p className="hint" style={{ marginBottom: 14 }}>
            {subtitle ??
              (unlockedCount > 0
                ? `확인한 힌트 ${unlockedCount}개 · 정답이 아니라 방향만 제시합니다.`
                : '아직 열린 힌트가 없습니다. 공격이 거절되면 단계적으로 제공됩니다.')}
          </p>

          {difficultyHints && difficultyHints.length > 0 ? (
            <Stage4HintGroups groups={difficultyHints} />
          ) : (
            <>
              {difficulty ? (
                <p className="hint hint-sm" style={{ marginBottom: 12 }}>
                  {difficulty} 난이도 힌트
                </p>
              ) : null}
              <Stage4HintsList hints={hints ?? []} />
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" type="button" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
