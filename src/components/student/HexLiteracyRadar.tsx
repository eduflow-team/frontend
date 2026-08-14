import { useEffect, useRef, useState } from 'react';
import {
  LITERACY_AXES,
  type LiteracyAxis,
  type LiteracyScores,
} from '../../constants/literacyAxes';

interface Hit {
  index: number;
  x: number;
  y: number;
  r: number;
  label: string;
  score: number | null;
  pointX?: number;
  pointY?: number;
}

function drawHexRadar(
  canvas: HTMLCanvasElement,
  axes: LiteracyAxis[],
  scores: LiteracyScores,
  highlightIndex: number,
): Hit[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const dpr = window.devicePixelRatio || 1;
  const size = 420;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = size / 2;
  const cy = size / 2 + 6;
  const radius = 138;
  const n = axes.length;
  const labelHits: Hit[] = [];

  const point = (i: number, r: number): [number, number] => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  ctx.clearRect(0, 0, size, size);

  for (let ring = 1; ring <= 4; ring++) {
    const r = (radius * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [x, y] = point(i, r);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = ring === 4 ? '#d1d1d6' : '#e8e8ea';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  axes.forEach((axis, i) => {
    const active = highlightIndex === i;
    const [x, y] = point(i, radius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = active ? '#0d0d0d' : '#e5e5e5';
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.stroke();

    const [lx, ly] = point(i, radius + 28);
    ctx.fillStyle = active ? '#0d0d0d' : '#3a3a3a';
    ctx.font = `${active ? '650' : '550'} 12px Pretendard, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = axis.label.split(' ');
    if (lines.length > 1) {
      ctx.fillText(lines[0], lx, ly - 7);
      ctx.fillText(lines.slice(1).join(' '), lx, ly + 8);
    } else {
      ctx.fillText(axis.label, lx, ly);
    }

    labelHits.push({
      index: i,
      x: lx,
      y: ly,
      r: 34,
      label: axis.label,
      score: scores[axis.key],
    });
  });

  const values = axes.map((a) => {
    const v = scores[a.key];
    return v == null ? 0 : Math.max(0, Math.min(100, v)) / 100;
  });

  ctx.beginPath();
  values.forEach((v, i) => {
    const [x, y] = point(i, radius * v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(13, 13, 13, 0.08)';
  ctx.fill();
  ctx.strokeStyle = '#0d0d0d';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  values.forEach((v, i) => {
    if (scores[axes[i].key] == null) return;
    const [x, y] = point(i, radius * v);
    const active = highlightIndex === i;
    ctx.beginPath();
    ctx.arc(x, y, active ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0d0d';
    ctx.fill();
    labelHits[i].pointX = x;
    labelHits[i].pointY = y;
  });

  return labelHits;
}

export function HexLiteracyRadar({ scores }: { scores: LiteracyScores }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitsRef = useRef<Hit[]>([]);
  const [tip, setTip] = useState<{ label: string; score: string; left: number; top: number } | null>(
    null,
  );
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    hitsRef.current = drawHexRadar(canvas, LITERACY_AXES, scores, active);
  }, [scores, active]);

  const hitTest = (x: number, y: number): Hit | null => {
    let best: Hit | null = null;
    let bestDist = Infinity;
    for (const h of hitsRef.current) {
      const dLabel = Math.hypot(x - h.x, y - h.y);
      if (dLabel < h.r && dLabel < bestDist) {
        best = h;
        bestDist = dLabel;
      }
      if (h.pointX != null && h.pointY != null) {
        const dPoint = Math.hypot(x - h.pointX, y - h.pointY);
        if (dPoint < 16 && dPoint < bestDist) {
          best = h;
          bestDist = dPoint;
        }
      }
    }
    return best;
  };

  return (
    <div className="hex-wrap">
      <canvas
        ref={canvasRef}
        width={420}
        height={420}
        aria-label="AI 리터러시 육각 점수판"
        className={tip ? 'is-hovering' : undefined}
        onMouseMove={(event) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const scaleX = 420 / rect.width;
          const scaleY = 420 / rect.height;
          const x = (event.clientX - rect.left) * scaleX;
          const y = (event.clientY - rect.top) * scaleY;
          const hit = hitTest(x, y);
          if (!hit) {
            setTip(null);
            if (active !== -1) setActive(-1);
            return;
          }
          if (hit.index !== active) setActive(hit.index);
          const scale = rect.width / 420;
          setTip({
            label: hit.label,
            score: hit.score == null ? '미이수' : `${hit.score}점`,
            left: hit.x * scale,
            top: hit.y * scale,
          });
        }}
        onMouseLeave={() => {
          setTip(null);
          setActive(-1);
        }}
      />
      {tip && (
        <div className="hex-tip" style={{ left: tip.left, top: tip.top }}>
          <strong>{tip.label}</strong>
          <span>{tip.score}</span>
        </div>
      )}
    </div>
  );
}
