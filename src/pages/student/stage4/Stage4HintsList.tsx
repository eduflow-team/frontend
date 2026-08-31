import type { Stage4DifficultyHints, Stage4HintItem } from '../../../api/types';

const HINT_LEVEL_LABELS = ['Lv.1', 'Lv.2', 'Lv.3'] as const;

interface Stage4HintsListProps {
  hints: Stage4HintItem[];
  compact?: boolean;
  emptyMessage?: string;
}

export function Stage4HintsList({
  hints,
  compact = false,
  emptyMessage = '공격이 거절되면 힌트가 단계적으로 제공됩니다.',
}: Stage4HintsListProps) {
  if (hints.length === 0) {
    return <p className="hint hint-sm">{emptyMessage}</p>;
  }

  return (
    <div className={`hint-list${compact ? ' hint-list--compact' : ''}`}>
      {hints.map((hint) => (
        <div
          key={hint.level}
          className={`hint-card hint-card--static${hint.unlocked ? ' used' : ' locked'}${
            compact ? ' hint-card--compact' : ''
          }`}
        >
          <strong>
            {HINT_LEVEL_LABELS[hint.level - 1] || `Lv.${hint.level}`}
            {hint.unlocked ? ' · 확인함' : ' · 잠김'}
          </strong>
          <p>
            {hint.unlocked
              ? hint.text
              : compact
                ? '거절이 쌓이면 열립니다.'
                : '공격이 거절되면 단계적으로 열립니다.'}
          </p>
        </div>
      ))}
    </div>
  );
}

interface Stage4HintGroupsProps {
  groups: Stage4DifficultyHints[];
  compact?: boolean;
}

export function Stage4HintGroups({ groups, compact = false }: Stage4HintGroupsProps) {
  if (groups.length === 0) {
    return <p className="hint hint-sm">아직 열린 힌트가 없습니다.</p>;
  }

  return (
    <div className={`hint-groups${compact ? ' hint-groups--compact' : ''}`}>
      {groups.map((group) => (
        <section key={group.difficulty} className="hint-group">
          {!compact ? (
            <h3 className="hint-group-title">
              {group.difficulty}
              {group.hint_level > 0 ? ` · Lv.${group.hint_level}까지 열림` : ''}
            </h3>
          ) : null}
          <Stage4HintsList hints={group.hints} compact={compact} />
        </section>
      ))}
    </div>
  );
}

export function countUnlockedHints(hints: Stage4HintItem[]): number {
  return hints.filter((h) => h.unlocked).length;
}

export function countUnlockedHintGroups(groups: Stage4DifficultyHints[]): number {
  return groups.reduce((sum, group) => sum + countUnlockedHints(group.hints), 0);
}
