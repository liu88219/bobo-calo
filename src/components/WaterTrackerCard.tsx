import React from 'react';
import { Droplets, Undo2 } from 'lucide-react';
import { WaterLog } from '../types/tracker';
import { getWaterPraise } from '../data/praiseMessages';

interface Props {
  todayWaters: WaterLog[];
  targetMl: number;
  onAddWater: (amountMl: number, label: string) => void;
  onDeleteWater: (id: string) => void;
}

const WATER_PRESETS = [
  { ml: 150, label: '一小口杯', emoji: '🍵' },
  { ml: 250, label: '馬克杯', emoji: '🥛' },
  { ml: 350, label: '隨行杯', emoji: '🧋' },
  { ml: 500, label: '大水壺', emoji: '💧' },
];

export const WaterTrackerCard: React.FC<Props> = ({
  todayWaters,
  targetMl,
  onAddWater,
  onDeleteWater,
}) => {
  const totalMl = todayWaters.reduce((sum, w) => sum + w.amountMl, 0);
  const safeTarget = Math.max(500, targetMl || 1800);
  const pct = Math.min(100, Math.round((totalMl / safeTarget) * 100));
  const praise = getWaterPraise(totalMl, safeTarget);

  return (
    <div className="doodle-card p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E1F1FA] border border-[#9CC8E4] flex items-center justify-center text-[#357296]">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-base text-[#422B1D]">Bobo 咕嚕喝水小站</h3>
            <p className="text-xs text-[#7C5841]">
              今日已喝 <span className="font-bold text-[#357296]">{totalMl}</span> / {safeTarget} ml（
              {pct}%）
            </p>
          </div>
        </div>
        {todayWaters.length > 0 && (
          <button
            type="button"
            onClick={() => onDeleteWater(todayWaters[0].id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF4EB] border border-[#DFC8AC] text-xs font-bold text-[#7C5841] hover:bg-[#F2E5D3]"
            title="復原上一筆喝水紀錄"
          >
            <Undo2 className="w-3.5 h-3.5" />
            復原
          </button>
        )}
      </div>

      {/* Cute Bobo Floating in Water Jar */}
      <div className="flex items-center gap-3.5 bg-[#F4FAFD] rounded-2xl p-3 border border-[#C6E3F4]">
        <div className="relative w-16 h-20 rounded-2xl border-2 border-[#422B1D] bg-white overflow-hidden shrink-0">
          {/* Rising Water Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#9AD0EC]/75 transition-all duration-500"
            style={{ height: `${Math.max(12, pct)}%` }}
          />
          {/* Cute Mini Bobo Head Floating */}
          <svg
            viewBox="0 0 64 64"
            className="absolute inset-0 w-full h-full anim-float-bob"
            aria-hidden="true"
          >
            <circle cx="22" cy="24" r="6" fill="#FFFDF9" stroke="#422B1D" strokeWidth="2.5" />
            <circle cx="42" cy="24" r="6" fill="#FFFDF9" stroke="#422B1D" strokeWidth="2.5" />
            <ellipse cx="32" cy="37" rx="16" ry="15" fill="#FFFDF9" stroke="#422B1D" strokeWidth="2.5" />
            <circle cx="27" cy="35" r="2" fill="#422B1D" />
            <circle cx="37" cy="35" r="2" fill="#422B1D" />
            <ellipse cx="22" cy="39" rx="3.2" ry="2" fill="#F4978E" />
            <ellipse cx="42" cy="39" rx="3.2" ry="2" fill="#F4978E" />
            <path d="M29.5 39 Q32 42 34.5 39" fill="none" stroke="#422B1D" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-xs leading-relaxed text-[#3B596B] font-medium">{praise}</p>
          <div className="w-full h-2.5 rounded-full bg-[#DCEEF8] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7FB5D5] to-[#4D96C4] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick +ml Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {WATER_PRESETS.map((btn) => (
          <button
            key={btn.ml}
            type="button"
            onClick={() => onAddWater(btn.ml, btn.label)}
            className="py-2 px-1 rounded-2xl bg-[#FFFDF9] hover:bg-[#EBF6FC] border-2 border-[#BBDCEF] text-center transition active:scale-95"
          >
            <div className="text-base">{btn.emoji}</div>
            <div className="text-xs font-black text-[#357296]">+{btn.ml}ml</div>
            <div className="text-[10px] text-[#7C5841]">{btn.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
