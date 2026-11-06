import React from 'react';
import { Droplets, Undo2 } from 'lucide-react';
import { WaterLog } from '../types/tracker';
import { getWaterPraise } from '../data/praiseMessages';
import { BoboWaterIllustration } from './QuokkaBoboArt';

interface Props {
  todayWaters: WaterLog[];
  targetMl: number;
  onAddWater: (amountMl: number, label: string) => void;
  onDeleteWater: (id: string) => void;
}

const WATER_PRESETS = [
  { ml: 150, label: '一小口杯', emoji: '🍵' },
  { ml: 250, label: '馬克杯', emoji: '🥛' },
  { ml: 350, label: '隨行杯', emoji: '🥤' },
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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#DFDDD4] flex items-center justify-center text-[#2A537A]">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-base text-[#2C241E]">BOBO 咕嚕喝水小站</h3>
            <p className="text-xs text-[#6E6459]">
              今日已喝 <span className="font-black text-[#2A537A]">{totalMl}</span> / {safeTarget} ml（
              {pct}%）
            </p>
          </div>
        </div>
        {todayWaters.length > 0 && (
          <button
            type="button"
            onClick={() => onDeleteWater(todayWaters[0].id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#EFECE3] text-xs font-bold text-[#5E5348] hover:bg-[#E4E0D5]"
            title="復原上一筆喝水紀錄"
          >
            <Undo2 className="w-3.5 h-3.5" />
            復原
          </button>
        )}
      </div>

      {/* Authentic DINOTAENG Lineless BOBO + Floating Marsh Water Cup */}
      <div className="flex items-center gap-3.5 bg-[#EFECE3] rounded-2xl p-3">
        <BoboWaterIllustration pct={pct} />

        <div className="flex-1 space-y-2">
          <p className="text-xs leading-relaxed text-[#3D342C] font-medium">{praise}</p>
          <div className="w-full h-2.5 rounded-full bg-[#DAD5C8] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#5F9BC0] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick +ml Soft Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {WATER_PRESETS.map((btn) => (
          <button
            key={btn.ml}
            type="button"
            onClick={() => onAddWater(btn.ml, btn.label)}
            className="py-2.5 px-1 rounded-2xl bg-[#EFECE3] hover:bg-[#E4E0D4] text-center transition active:scale-95"
          >
            <div className="text-base">{btn.emoji}</div>
            <div className="text-xs font-black text-[#2A537A]">+{btn.ml}ml</div>
            <div className="text-[10px] text-[#6E6459]">{btn.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
