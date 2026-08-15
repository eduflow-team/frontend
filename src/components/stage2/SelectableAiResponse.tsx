import { useRef } from 'react';

interface TextPart {
  type: 'text' | 'cleared';
  value: string;
}

function buildParts(text: string, clearedHighlights: string[]): TextPart[] {
  const cleared = [...clearedHighlights].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!text) return [];
  if (cleared.length === 0) return [{ type: 'text', value: text }];

  const parts: TextPart[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let nearest = '';
    let nearestIndex = text.length;
    for (const highlight of cleared) {
      const index = text.indexOf(highlight, cursor);
      if (index !== -1 && index < nearestIndex) {
        nearest = highlight;
        nearestIndex = index;
      }
    }
    if (!nearest) {
      parts.push({ type: 'text', value: text.slice(cursor) });
      break;
    }
    if (nearestIndex > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, nearestIndex) });
    }
    parts.push({ type: 'cleared', value: nearest });
    cursor = nearestIndex + nearest.length;
  }
  return parts;
}

interface SelectableAiResponseProps {
  text: string;
  clearedHighlights: string[];
  selectedText: string;
  selectable: boolean;
  onSelect: (text: string) => void;
}

export function SelectableAiResponse({
  text,
  clearedHighlights,
  selectedText,
  selectable,
  onSelect,
}: SelectableAiResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parts = buildParts(text, clearedHighlights);

  const handleMouseUp = () => {
    if (!selectable || !containerRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;
    const value = selection.toString().trim();
    if (value) onSelect(value);
  };

  return (
    <div>
      <div
        ref={containerRef}
        className={`stage2-ai-response${selectable ? ' selectable' : ''}`}
        onMouseUp={handleMouseUp}
        aria-label="AI 답변"
      >
        {parts.map((part, index) =>
          part.type === 'cleared' ? (
            <mark key={`${part.value}-${index}`} title="찾은 오류">
              {part.value}
            </mark>
          ) : (
            <span key={`text-${index}`}>{part.value}</span>
          ),
        )}
      </div>
      {selectable && selectedText && (
        <div className="stage2-selected-text">
          <strong>선택한 구간</strong>
          <span>{selectedText}</span>
        </div>
      )}
    </div>
  );
}
