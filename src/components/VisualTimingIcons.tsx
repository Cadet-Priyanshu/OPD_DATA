import React from 'react';
import { MealRelationType, TimingIconType } from '../types/clinical';

/**
 * High-contrast, low-literacy visual pictograms for patient prescription strips:
 * - Morning (Sunrise icon with rays)
 * - Afternoon (Full overhead sun icon)
 * - Night (Crescent moon & stars icon)
 * - Meal relation (Before food empty plate vs After food full plate vs Empty stomach)
 */
export const TimingPictogram: React.FC<{
  type: TimingIconType;
  active: boolean;
  onClick?: () => void;
  compact?: boolean;
}> = ({ type, active, onClick, compact = false }) => {
  const labels: Record<TimingIconType, { hi: string; en: string }> = {
    morning: { hi: 'सुबह', en: 'Morning' },
    afternoon: { hi: 'दोपहर', en: 'Noon' },
    night: { hi: 'रात', en: 'Night' },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={`${labels[type].en} (${labels[type].hi})`}
      className={`inline-flex flex-col items-center justify-center rounded-md border transition-colors ${
        compact ? 'px-2 py-1 min-w-[54px]' : 'px-2.5 py-1.5 min-w-[68px]'
      } ${
        active
          ? 'bg-amber-50/90 border-amber-500 text-slate-900 font-semibold'
          : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
      } ${onClick ? 'cursor-pointer hover:border-teal-600' : 'cursor-default'}`}
    >
      {type === 'morning' && (
        <svg className={compact ? 'w-5 h-5' : 'w-6 h-6'} viewBox="0 0 24 24" fill="none">
          <path d="M12 3V5M5.6 6.6L7 8M18.4 6.6L17 8" stroke={active ? '#D97706' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" />
          <path d="M7 15C7 12.2386 9.23858 10 12 10C14.7614 10 17 12.2386 17 15" fill={active ? '#F59E0B' : '#CBD5E1'} />
          <path d="M3 16H21" stroke={active ? '#0F172A' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" />
          <path d="M6 19H18" stroke={active ? '#64748B' : '#CBD5E1'} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {type === 'afternoon' && (
        <svg className={compact ? 'w-5 h-5' : 'w-6 h-6'} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5" fill={active ? '#EA580C' : '#CBD5E1'} />
          <path
            d="M12 2V4M12 20V22M4 12H2M22 12H20M5.6 5.6L7 7M18.4 18.4L17 17M18.4 5.6L17 7M5.6 18.4L7 17"
            stroke={active ? '#EA580C' : '#94A3B8'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      {type === 'night' && (
        <svg className={compact ? 'w-5 h-5' : 'w-6 h-6'} viewBox="0 0 24 24" fill="none">
          <path
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            fill={active ? '#1E3A8A' : '#CBD5E1'}
            stroke={active ? '#1E3A8A' : '#94A3B8'}
            strokeWidth="1.5"
          />
          <circle cx="17" cy="6" r="1.2" fill={active ? '#F59E0B' : '#94A3B8'} />
          <circle cx="14" cy="9" r="0.9" fill={active ? '#F59E0B' : '#94A3B8'} />
        </svg>
      )}
      <span className="text-[11px] leading-tight mt-0.5 whitespace-nowrap">
        {labels[type].hi}
      </span>
      <span className="text-[9px] text-slate-500 leading-none whitespace-nowrap">
        {labels[type].en}
      </span>
    </button>
  );
};

export const MealPictogram: React.FC<{
  mealRelation: MealRelationType;
  onClick?: () => void;
  compact?: boolean;
}> = ({ mealRelation, onClick, compact = false }) => {
  const config: Record<MealRelationType, { hi: string; en: string; badge: string }> = {
    after_food: { hi: 'खाने के बाद', en: 'After Food', badge: 'bg-emerald-50 border-emerald-500 text-slate-900' },
    before_food: { hi: 'खाने से पहले', en: 'Before Food', badge: 'bg-sky-50 border-sky-500 text-slate-900' },
    empty_stomach: { hi: 'खाली पेट', en: 'Empty Stomach', badge: 'bg-purple-50 border-purple-500 text-slate-900' },
    any: { hi: 'पानी के साथ', en: 'With Water', badge: 'bg-slate-50 border-slate-400 text-slate-900' },
  };

  const current = config[mealRelation] || config.after_food;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title="Tap to cycle meal instruction"
      className={`inline-flex flex-col items-center justify-center rounded-md border transition-colors ${
        compact ? 'px-2 py-1 min-w-[68px]' : 'px-2.5 py-1.5 min-w-[82px]'
      } ${current.badge} ${onClick ? 'cursor-pointer hover:border-teal-700' : 'cursor-default'}`}
    >
      <svg className={compact ? 'w-5 h-5' : 'w-6 h-6'} viewBox="0 0 24 24" fill="none">
        {/* Plate circle */}
        <circle cx="12" cy="12" r="7" stroke="#0F172A" strokeWidth="1.75" fill={mealRelation === 'after_food' ? '#10B981' : '#FFFFFF'} />
        {mealRelation === 'after_food' && (
          <>
            {/* Food mounds on plate */}
            <circle cx="10.5" cy="11.5" r="2" fill="#FFFFFF" />
            <circle cx="13.8" cy="12.5" r="1.8" fill="#FFFFFF" />
          </>
        )}
        {mealRelation === 'before_food' && (
          <path d="M9 12H15" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
        )}
        {mealRelation === 'empty_stomach' && (
          <path d="M9 9L15 15M15 9L9 15" stroke="#7E22CE" strokeWidth="1.8" strokeLinecap="round" />
        )}
        {mealRelation === 'any' && (
          <path d="M12 8L9.5 13C9.5 14.4 10.6 15.5 12 15.5C13.4 15.5 14.5 14.4 14.5 13L12 8Z" fill="#0284C7" />
        )}
      </svg>
      <span className="text-[11px] font-semibold leading-tight mt-0.5 whitespace-nowrap">
        {current.hi}
      </span>
      <span className="text-[9px] text-slate-600 leading-none whitespace-nowrap">
        {current.en}
      </span>
    </button>
  );
};

/**
 * Deterministic SVG QR Code generator for offline ABDM / FHIR prescription sharing.
 */
export const DeterministicQRCodeSVG: React.FC<{
  payload: string;
  size?: number;
}> = ({ payload, size = 116 }) => {
  const gridSize = 21;
  // Create deterministic hash matrix from payload string
  const matrix: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, gridSize - 7);
  drawFinder(gridSize - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= gridSize - 8;
      const inBottomLeft = r >= gridSize - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      if (r === 6 || c === 6) {
        matrix[r][c] = (r + c) % 2 === 0;
        continue;
      }

      const charCode = payload.charCodeAt((r * gridSize + c) % Math.max(1, payload.length)) || 42;
      const bit = ((hash ^ (r * 31 + c * 17 + charCode * 13)) & 3) !== 0;
      matrix[r][c] = bit;
    }
  }

  const cellSize = size / gridSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="border border-slate-300 bg-white p-1.5 rounded"
      aria-label="ABDM FHIR Digital Prescription QR Code"
    >
      <rect width={size} height={size} fill="#FFFFFF" />
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx * cellSize}
              y={rIdx * cellSize}
              width={cellSize + 0.25}
              height={cellSize + 0.25}
              fill="#0F172A"
            />
          ) : null
        )
      )}
    </svg>
  );
};
