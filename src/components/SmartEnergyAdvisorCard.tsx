import React from 'react';
import { Flame, Sparkles, Star, Target, X, Plus } from 'lucide-react';
import {
  DailyEnergyAdvice,
  FavoriteSportPreset,
} from '../types/tracker';
import {
  ExtraSportCategory,
  calculateExtraSportCalories,
} from '../data/extraSports';

interface Props {
  advice: DailyEnergyAdvice;
  weightKg: number;
  favoriteSports: FavoriteSportPreset[];
  activePlanTargetKcal: number;
  onApplyRecommendedBurnToPlan: (targetKcal: number) => void;
  onOpenExtraSportModal: (initialCategory?: ExtraSportCategory | 'custom') => void;
  onQuickLogFavoriteSport: (preset: FavoriteSportPreset, kcal: number) => void;
  onRemoveFavoriteSport: (presetId: string) => void;
}

export const SmartEnergyAdvisorCard: React.FC<Props> = ({
  advice,
  weightKg,
  favoriteSports,
  activePlanTargetKcal,
  onApplyRecommendedBurnToPlan,
  onOpenExtraSportModal,
  onQuickLogFavoriteSport,
  onRemoveFavoriteSport,
}) => {
  const {
    dailyBudget,
    eatenKcal,
    burnedKcal,
    overIntakeKcal,
    underIntakeKcal,
    recommendedBurnKcal,
    gentleHalfBurnKcal,
    remainingBurnNeededKcal,
    netCaloriesAfterBurn,
    isBurnGoalMet,
  } = advice;

  // Estimate roughly how many minutes of K-pop dance / badminton (MET ~5.6) equals remainingBurnNeededKcal
  const approxSportMins = Math.max(
    10,
    Math.round(
      (remainingBurnNeededKcal / Math.max(1, 5.6 * Math.max(35, weightKg || 54) * 1.05)) * 60 / 5
    ) * 5
  );

  return (
    <div className="rounded-2xl bg-[#FAF8F3] border border-[#DDD7C9] p-3.5 space-y-3">
      {/* Title Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-black text-[#2C241E] flex items-center gap-1.5">
          <span>🧮</span>
          <span>今日攝取 vs 建議消耗智慧試算</span>
        </div>
        {overIntakeKcal > 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-[#FCE1DC] text-[#7D362B] text-[10px] font-black">
            比預算多攝取 +{overIntakeKcal} kcal
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-[#E3F1DF] text-[#355E30] text-[10px] font-black">
            預算內安心享食 ✨
          </span>
        )}
      </div>

      {/* 3-Box Formula Comparison: 需攝取 vs 已攝取/多攝取 vs 建議消耗 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[#EFECE3] p-2.5">
          <div className="text-[10px] font-bold text-[#6E6459]">今日需攝取</div>
          <div className="text-sm font-black text-[#2C241E] mt-0.5">{dailyBudget}</div>
          <div className="text-[10px] text-[#8A7E70]">目標預算 kcal</div>
        </div>

        <div
          className={`rounded-xl p-2.5 border ${
            overIntakeKcal > 0
              ? 'bg-[#FFF3EF] border-[#EABfb6]'
              : 'bg-[#EFECE3] border-transparent'
          }`}
        >
          <div className="text-[10px] font-bold text-[#6E6459]">目前已攝取</div>
          <div className="text-sm font-black text-[#2C241E] mt-0.5">{eatenKcal}</div>
          <div
            className={`text-[10px] font-black ${
              overIntakeKcal > 0 ? 'text-[#C83B32]' : 'text-[#355E30]'
            }`}
          >
            {overIntakeKcal > 0
              ? `多攝取 +${overIntakeKcal}`
              : `還可吃 ${underIntakeKcal}`}
          </div>
        </div>

        <div className="rounded-xl bg-[#FFF6E2] border border-[#E5C98B] p-2.5">
          <div className="text-[10px] font-bold text-[#6E6459]">建議完成消耗</div>
          <div className="text-sm font-black text-[#C83B32] mt-0.5">
            🔥 {recommendedBurnKcal}
          </div>
          <div className="text-[10px] text-[#7A5116] font-bold">
            {overIntakeKcal > 0 ? '抵銷多攝取' : '每日基礎雕塑'}
          </div>
        </div>
      </div>

      {/* Deduction Summary after Today's Logged Workouts */}
      <div
        className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
          isBurnGoalMet
            ? 'bg-[#E3F1DF]/80 text-[#2B4E27] border border-[#8FBC8B]'
            : 'bg-[#EFECE3]/85 text-[#3D342C]'
        }`}
      >
        {isBurnGoalMet ? (
          <div className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#355E30] shrink-0" />
            <span>
              太棒啦！今天已運動消耗 <b>{burnedKcal} kcal</b>，建議的{' '}
              <b>{recommendedBurnKcal} kcal</b> 已經完美達標（運動後淨攝取{' '}
              <b>{netCaloriesAfterBurn} kcal</b>）🤎
            </span>
          </div>
        ) : (
          <div className="space-y-0.5">
            <div>
              目前已消耗 <b className="text-[#485F44]">{burnedKcal} kcal</b> ➜ 建議再完成{' '}
              <b className="text-[#C83B32] text-sm">🔥 {remainingBurnNeededKcal} kcal</b>{' '}
              {overIntakeKcal > 0 ? '就能把多攝取的熱量退回預算線內囉！' : '達成今日雕塑小目標！'}
            </div>
            <div className="text-[11px] text-[#6E6459]">
              {remainingBurnNeededKcal >= 160
                ? `💡 約等於跳舞／打球 ${approxSportMins} 分鐘；沒上課也可點「溫柔減半」配居家動作無壓力完成！`
                : '💡 點下方「套用建議值」即可自動配好 4 分鐘手部／床上跟練清單！'}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Apply Recommended Target + Gentle Half + Dance/Ball Quick Log */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onApplyRecommendedBurnToPlan(recommendedBurnKcal)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition ${
            activePlanTargetKcal === recommendedBurnKcal
              ? 'bg-[#F3C85F] border-[#2C241E] text-[#2C241E]'
              : 'bg-[#2C241E] border-[#2C241E] text-white active:scale-95'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          {activePlanTargetKcal === recommendedBurnKcal
            ? `已套用建議 (${recommendedBurnKcal} kcal)`
            : `套用建議 (${recommendedBurnKcal} kcal) 配清單`}
        </button>

        {overIntakeKcal > 200 && gentleHalfBurnKcal < recommendedBurnKcal && (
          <button
            type="button"
            onClick={() => onApplyRecommendedBurnToPlan(gentleHalfBurnKcal)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
              activePlanTargetKcal === gentleHalfBurnKcal
                ? 'bg-[#F3C85F] border-[#2C241E] text-[#2C241E]'
                : 'bg-white border-[#D8D2C5] text-[#4A3F35]'
            }`}
          >
            🌱 溫柔減半 ({gentleHalfBurnKcal} kcal)
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenExtraSportModal('dance')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FFF6E2] border border-[#DFC27D] text-[11px] font-black text-[#5C3F2D] active:scale-95 transition"
        >
          💃 記跳舞消耗
        </button>

        <button
          type="button"
          onClick={() => onOpenExtraSportModal('ball')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#E3F1DF] border border-[#8FBC8B] text-[11px] font-black text-[#2F522B] active:scale-95 transition"
        >
          🏸 記打球消耗
        </button>
      </div>

      {/* Pinned Regular Sports (1-Tap Quick Log!) */}
      <div className="pt-1 border-t border-[#E6E0D3] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-[#4A3F35] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#E09F3E] fill-current" />
            固定常用運動（點一下 1 秒打卡）
          </span>
          <button
            type="button"
            onClick={() => onOpenExtraSportModal('dance')}
            className="text-[11px] font-bold text-[#25385B] inline-flex items-center gap-0.5 hover:underline"
          >
            <Plus className="w-3 h-3" /> 新增／計算其他運動
          </button>
        </div>

        {favoriteSports.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {favoriteSports.map((fav) => {
              const kcal =
                fav.customCalories && fav.customCalories > 0
                  ? fav.customCalories
                  : calculateExtraSportCalories({
                      met: fav.met,
                      weightKg,
                      minutes: fav.minutes,
                      effort: fav.effort,
                    });
              return (
                <div
                  key={fav.id}
                  className="inline-flex items-center rounded-full bg-white border border-[#D8D2C5] shadow-2xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => onQuickLogFavoriteSport(fav, kcal)}
                    className="px-2.5 py-1 text-[11px] font-black text-[#2C241E] hover:bg-[#FFF6E2] flex items-center gap-1 transition"
                    title="點一下直接記下今日消耗！"
                  >
                    <span>{fav.emoji}</span>
                    <span>
                      {fav.name} {fav.minutes}分
                    </span>
                    <span className="text-[#C83B32] flex items-center">
                      <Flame className="w-3 h-3 fill-current" />
                      {kcal}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFavoriteSport(fav.id)}
                    className="px-1.5 py-1 text-[#9C8F80] hover:text-[#C83B32] border-l border-[#ECE7DC]"
                    title="取消釘選此常用運動"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-[#8A7E70]">
            常去上跳舞課或打羽球／匹克球嗎？點上方「💃 記跳舞消耗」或「🏸 記打球消耗」勾選釘選，之後就能在這裡 1 秒打卡囉！
          </p>
        )}
      </div>
    </div>
  );
};
