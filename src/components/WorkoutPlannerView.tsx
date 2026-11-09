import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Plus,
  Minus,
  Sparkles,
  Flame,
  Trash2,
  Music,
  CheckCircle2,
  Circle,
  Dices,
  Target,
} from 'lucide-react';
import {
  MealLog,
  WorkoutLog,
  WorkoutPlaylistItem,
  DailyWorkoutPlan,
  DailyWorkoutPlanItem,
  ExerciseCategory,
  calculateExerciseCalories,
} from '../types/tracker';
import {
  EXERCISES,
  ChallengeIntensity,
  buildMealChallengePlaylist,
  buildDailyCalorieTargetPlan,
  matchCompletedPlanItems,
  getExerciseById,
} from '../data/exercises';
import { soundEngine } from '../services/soundEffects';
import { ExerciseAnimationStage, MarshmallowStampBadge } from './QuokkaBoboArt';

interface Props {
  dateKey: string;
  todayMeals: MealLog[];
  dayWorkouts: WorkoutLog[];
  eatenKcal: number;
  dailyBudget: number;
  weightKg: number;
  defaultBurnTargetKcal: number;
  savedDailyPlan?: DailyWorkoutPlan;
  initialFocusMeal?: MealLog | null;
  onSaveDailyPlan: (plan: DailyWorkoutPlan, nextDefaultTargetKcal?: number) => void;
  onQuickTogglePlanItem: (
    item: DailyWorkoutPlanItem,
    existingMatchedLog?: WorkoutLog
  ) => void;
  onStartPlaylist: (playlist: WorkoutPlaylistItem[], sourceMealId?: string) => void;
}

export const WorkoutPlannerView: React.FC<Props> = ({
  dateKey,
  todayMeals,
  dayWorkouts,
  eatenKcal,
  dailyBudget,
  weightKg,
  defaultBurnTargetKcal,
  savedDailyPlan,
  initialFocusMeal,
  onSaveDailyPlan,
  onQuickTogglePlanItem,
  onStartPlaylist,
}) => {
  const [plannerMode, setPlannerMode] = useState<'daily_target' | 'combo' | 'pick'>(() =>
    initialFocusMeal ? 'combo' : 'daily_target'
  );

  useEffect(() => {
    if (initialFocusMeal) {
      setPlannerMode('combo');
      setSelectedMealId(initialFocusMeal.id);
      setIntensity('gentle_25');
    }
  }, [initialFocusMeal]);

  // === Mode 0 (NEW): Daily Target Calorie Plan & Completion Checklist ===
  const activeDailyPlan = useMemo<DailyWorkoutPlan>(() => {
    if (savedDailyPlan && savedDailyPlan.items.length > 0) {
      return savedDailyPlan;
    }
    const target = Math.max(20, Math.round(defaultBurnTargetKcal || 80));
    return {
      dateKey,
      targetKcal: target,
      variantSeed: 0,
      items: buildDailyCalorieTargetPlan(target, weightKg, 0),
      updatedAt: 0,
    };
  }, [savedDailyPlan, defaultBurnTargetKcal, dateKey, weightKg]);

  const [targetInputStr, setTargetInputStr] = useState<string>(() =>
    String(activeDailyPlan.targetKcal)
  );

  useEffect(() => {
    setTargetInputStr(String(activeDailyPlan.targetKcal));
  }, [dateKey, activeDailyPlan.targetKcal]);

  const matchedCompletedMap = useMemo(
    () => matchCompletedPlanItems(activeDailyPlan.items, dayWorkouts),
    [activeDailyPlan.items, dayWorkouts]
  );

  const burnedTodayKcal = useMemo(
    () => dayWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0),
    [dayWorkouts]
  );

  const plannedTotalStats = useMemo(() => {
    let totalSec = 0;
    let totalKcal = 0;
    let completedCount = 0;
    for (const item of activeDailyPlan.items) {
      const def = getExerciseById(item.exerciseId);
      totalSec += item.durationSec;
      totalKcal += calculateExerciseCalories(def.met, weightKg, item.durationSec);
      if (matchedCompletedMap[item.id]) {
        completedCount += 1;
      }
    }
    return { totalSec, totalKcal, completedCount };
  }, [activeDailyPlan.items, weightKg, matchedCompletedMap]);

  const uncompletedPlaylist = useMemo<WorkoutPlaylistItem[]>(() => {
    return activeDailyPlan.items
      .filter((it) => !matchedCompletedMap[it.id])
      .map((it) => ({
        exerciseId: it.exerciseId,
        durationSec: it.durationSec,
        planItemId: it.id,
      }));
  }, [activeDailyPlan.items, matchedCompletedMap]);

  const uncompletedStats = useMemo(() => {
    const sec = uncompletedPlaylist.reduce((s, x) => s + x.durationSec, 0);
    const kcal = uncompletedPlaylist.reduce(
      (s, x) =>
        s + calculateExerciseCalories(getExerciseById(x.exerciseId).met, weightKg, x.durationSec),
      0
    );
    return { sec, kcal };
  }, [uncompletedPlaylist, weightKg]);

  const applyNewDailyTarget = (rawKcal: number, nextSeed = activeDailyPlan.variantSeed) => {
    const cleanTarget = Math.max(15, Math.min(800, Math.round(rawKcal || 80)));
    setTargetInputStr(String(cleanTarget));
    const newItems = buildDailyCalorieTargetPlan(cleanTarget, weightKg, nextSeed);
    onSaveDailyPlan(
      {
        dateKey,
        targetKcal: cleanTarget,
        variantSeed: nextSeed,
        items: newItems,
        updatedAt: Date.now(),
      },
      cleanTarget
    );
  };

  const handleRegenerateFromInput = () => {
    const parsed = Number.parseInt(targetInputStr, 10);
    if (!Number.isFinite(parsed) || parsed < 15) {
      applyNewDailyTarget(80, activeDailyPlan.variantSeed);
      return;
    }
    applyNewDailyTarget(parsed, activeDailyPlan.variantSeed);
  };

  const handleShuffleDailyPlan = () => {
    const nextSeed = (activeDailyPlan.variantSeed || 0) + 1;
    applyNewDailyTarget(activeDailyPlan.targetKcal, nextSeed);
  };

  const handleAdjustPlanItemSec = (itemId: string, deltaSec: number) => {
    const updatedItems = activeDailyPlan.items
      .map((it) =>
        it.id === itemId
          ? { ...it, durationSec: Math.min(360, Math.max(30, it.durationSec + deltaSec)) }
          : it
      );
    const nextTotalKcal = updatedItems.reduce(
      (sum, it) =>
        sum + calculateExerciseCalories(getExerciseById(it.exerciseId).met, weightKg, it.durationSec),
      0
    );
    onSaveDailyPlan({
      ...activeDailyPlan,
      dateKey,
      targetKcal: nextTotalKcal,
      items: updatedItems,
      updatedAt: Date.now(),
    });
  };

  const surplusKcal = Math.max(0, Math.round(eatenKcal - dailyBudget));
  const dailyBurnPct = Math.min(
    100,
    Math.round((burnedTodayKcal / Math.max(1, activeDailyPlan.targetKcal)) * 100)
  );
  const remainingBurnToGoal = Math.max(0, activeDailyPlan.targetKcal - burnedTodayKcal);

  // === Mode 1 (Existing): Combo & Post-Meal Menu ===
  const [selectedMealId, setSelectedMealId] = useState<string>(
    initialFocusMeal?.id || todayMeals[0]?.id || 'custom'
  );
  const [customMealKcalInput, setCustomMealKcalInput] = useState<string>('500');
  const [intensity, setIntensity] = useState<ChallengeIntensity>(
    initialFocusMeal ? 'gentle_25' : 'quick_4min_arm_bed'
  );

  // === Mode 2 (Existing): Pick & Mix Cart (default 4-min exercises!) ===
  const [pickTargetKcalInput, setPickTargetKcalInput] = useState<string>(() =>
    String(initialFocusMeal ? Math.max(40, Math.round(initialFocusMeal.totalCalories * 0.25)) : 60)
  );
  const pickTargetKcal = Math.max(10, Number.parseInt(pickTargetKcalInput, 10) || 60);
  const [filterCat, setFilterCat] = useState<'all' | ExerciseCategory>('all');
  const [cart, setCart] = useState<WorkoutPlaylistItem[]>([
    { exerciseId: 'swan_arm_circles', durationSec: 240 },
    { exerciseId: 'bed_air_bike', durationSec: 240 },
  ]);

  const activeMeal = useMemo(
    () => todayMeals.find((m) => m.id === selectedMealId) || null,
    [todayMeals, selectedMealId]
  );

  const customMealKcal = Number.parseInt(customMealKcalInput, 10) || 400;
  const baseMealCalories = activeMeal ? activeMeal.totalCalories : Math.max(50, customMealKcal);

  const autoCombo = useMemo(
    () => buildMealChallengePlaylist(baseMealCalories, weightKg, intensity),
    [baseMealCalories, weightKg, intensity]
  );

  const autoComboStats = useMemo(() => {
    const totalSec = autoCombo.items.reduce((s, x) => s + x.durationSec, 0);
    const totalKcal = autoCombo.items.reduce(
      (s, x) =>
        s +
        calculateExerciseCalories(getExerciseById(x.exerciseId).met, weightKg, x.durationSec),
      0
    );
    return { totalSec, totalKcal };
  }, [autoCombo, weightKg]);

  const cartStats = useMemo(() => {
    const totalSec = cart.reduce((s, x) => s + x.durationSec, 0);
    const totalKcal = cart.reduce(
      (s, x) =>
        s +
        calculateExerciseCalories(getExerciseById(x.exerciseId).met, weightKg, x.durationSec),
      0
    );
    return { totalSec, totalKcal };
  }, [cart, weightKg]);

  const addToCart = (exerciseId: string, defaultSec: number) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.exerciseId === exerciseId);
      if (existing) {
        return prev.map((x) =>
          x.exerciseId === exerciseId ? { ...x, durationSec: x.durationSec + 60 } : x
        );
      }
      return [...prev, { exerciseId, durationSec: defaultSec }];
    });
  };

  const adjustCartDuration = (exerciseId: string, deltaSec: number) => {
    setCart((prev) =>
      prev
        .map((x) =>
          x.exerciseId === exerciseId ? { ...x, durationSec: x.durationSec + deltaSec } : x
        )
        .filter((x) => x.durationSec >= 30)
    );
  };

  const visibleExercises = useMemo(() => {
    return EXERCISES.filter((e) => filterCat === 'all' || e.category === filterCat);
  }, [filterCat]);

  const formatDurationLabel = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}秒`;
    if (s === 0) return `${m}分鐘`;
    return `${m}分${s}秒`;
  };

  return (
    <div className="space-y-4">
      {/* 3-Tab Mode Switcher (Additive: Daily Calorie Plan + Meal Combo + 4-Min Gallery) */}
      <div className="doodle-card p-2.5">
        <div className="grid grid-cols-3 rounded-2xl bg-[#EFECE3] p-1 gap-1">
          <button
            type="button"
            onClick={() => setPlannerMode('daily_target')}
            className={`py-2.5 px-1.5 rounded-xl text-[11px] font-black transition ${
              plannerMode === 'daily_target'
                ? 'bg-[#F3C85F] text-[#2C241E] shadow-sm border border-[#2C241E]/30'
                : 'text-[#4A3F35]'
            }`}
          >
            🎯 每日目標計畫
          </button>
          <button
            type="button"
            onClick={() => setPlannerMode('combo')}
            className={`py-2.5 px-1.5 rounded-xl text-[11px] font-black transition ${
              plannerMode === 'combo' ? 'bg-[#C83B32] text-white shadow-sm' : 'text-[#4A3F35]'
            }`}
          >
            ✨ 4分鐘／餐後配
          </button>
          <button
            type="button"
            onClick={() => setPlannerMode('pick')}
            className={`py-2.5 px-1.5 rounded-xl text-[11px] font-black transition ${
              plannerMode === 'pick' ? 'bg-[#25385B] text-white shadow-sm' : 'text-[#4A3F35]'
            }`}
          >
            💪 4分鐘動作圖鑑
          </button>
        </div>
      </div>

      {plannerMode === 'daily_target' ? (
        /* === NEW Mode 0: Daily Target Calorie Plan & Completion Checklist === */
        <div className="doodle-card p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-black text-base text-[#2C241E] flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#C83B32]" />
                今日目標卡路里運動計畫＆打卡清單
              </h3>
              <p className="text-xs text-[#6E6459] mt-0.5">
                輸入今天想消耗的大卡，自動幫妳配好簡短 4 分鐘手部＋床上運動，逐項跟練或直接打勾完成！
              </p>
            </div>
          </div>

          {/* Target Calorie Input + Quick Presets */}
          <div className="rounded-2xl bg-[#EFECE3] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black text-[#2C241E]">
                🔥 設定今日想消耗的卡路里：
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="80"
                  value={targetInputStr}
                  onChange={(e) => setTargetInputStr(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRegenerateFromInput();
                  }}
                  className="w-20 px-2.5 py-1.5 rounded-xl border border-[#D8D2C5] bg-white text-sm font-black text-center text-[#C83B32] focus:outline-none focus:border-[#2C241E]"
                />
                <span className="text-xs font-bold text-[#5C5145]">kcal</span>
                <button
                  type="button"
                  onClick={handleRegenerateFromInput}
                  className="px-3 py-1.5 rounded-xl bg-[#2C241E] text-white text-xs font-black active:scale-95 transition"
                >
                  制定項目
                </button>
              </div>
            </div>

            {/* Quick Calorie Target Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { kcal: 50, label: '🌱 50 kcal 溫柔維持' },
                { kcal: 80, label: '✨ 80 kcal 每日雕塑' },
                { kcal: 120, label: '🌤️ 120 kcal 活力微汗' },
                { kcal: 180, label: '🔥 180 kcal 進階燃脂' },
              ].map((preset) => {
                const active = activeDailyPlan.targetKcal === preset.kcal;
                return (
                  <button
                    key={preset.kcal}
                    type="button"
                    onClick={() => applyNewDailyTarget(preset.kcal)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                      active
                        ? 'bg-[#F3C85F] border-[#2C241E] text-[#2C241E]'
                        : 'bg-[#FAF8F3] border-[#DDD7C9] text-[#5C5145]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {surplusKcal > 0 ? (
                <button
                  type="button"
                  onClick={() => applyNewDailyTarget(surplusKcal)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#FCE1DC] border border-[#C83B32] text-[#7D362B]"
                >
                  🍱 補齊今日超標 {surplusKcal} kcal
                </button>
              ) : eatenKcal > 0 ? (
                <button
                  type="button"
                  onClick={() => applyNewDailyTarget(Math.max(40, Math.round(eatenKcal * 0.2)))}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E3F1DF] border border-[#8FBC8B] text-[#355E30]"
                >
                  🍱 抵銷今日飲食 20% ({Math.max(40, Math.round(eatenKcal * 0.2))} kcal)
                </button>
              ) : null}
            </div>
          </div>

          {/* Live Daily Burn Progress Bar */}
          <div className="rounded-2xl bg-[#FAF8F3] border border-[#DDD7C9] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-[#2C241E]">
                今日進度：已完成 {plannedTotalStats.completedCount} / {activeDailyPlan.items.length} 項
              </div>
              <div className="text-sm font-black text-[#C83B32]">
                🔥 已消耗 {burnedTodayKcal} / {activeDailyPlan.targetKcal} kcal
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-[#E5E0D4] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6D8B67] via-[#F3C85F] to-[#C83B32] transition-all duration-500"
                style={{ width: `${dailyBurnPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6E6459]">
              {remainingBurnToGoal === 0 ? (
                <span className="font-bold text-[#355E30]">
                  🎉 太強啦！今天設定的 {activeDailyPlan.targetKcal} kcal 消耗目標已經 100% 達標囉！
                </span>
              ) : (
                <span>
                  距離今日目標還差 <b className="text-[#C83B32]">{remainingBurnToGoal} kcal</b>，跟著下面項目一項一項完成吧 🤎
                </span>
              )}
              {remainingBurnToGoal === 0 && <MarshmallowStampBadge label="目標達成！" />}
            </div>
          </div>

          {/* Formulated Exercise Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#3D342C]">
                📋 為妳制定的專屬項目（共 {formatDurationLabel(plannedTotalStats.totalSec)} · 預計{' '}
                {plannedTotalStats.totalKcal} kcal）
              </span>
              <button
                type="button"
                onClick={handleShuffleDailyPlan}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFECE3] hover:bg-[#E3DFD3] text-[11px] font-bold text-[#25385B]"
              >
                <Dices className="w-3.5 h-3.5" /> 換一組動作
              </button>
            </div>

            <div className="space-y-2">
              {activeDailyPlan.items.map((item, idx) => {
                const def = getExerciseById(item.exerciseId);
                const kcal = calculateExerciseCalories(def.met, weightKg, item.durationSec);
                const matchedLog = matchedCompletedMap[item.id];
                const isDone = Boolean(matchedLog);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition space-y-2 ${
                      isDone
                        ? 'bg-[#E3F1DF]/65 border-[#8FBC8B]'
                        : 'bg-[#EFECE3] border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isDone) {
                              soundEngine.unlock();
                              soundEngine.playVictoryFanfare();
                            }
                            onQuickTogglePlanItem(item, matchedLog);
                          }}
                          className="mt-0.5 shrink-0"
                          title={isDone ? '點擊取消打卡' : '直接打勾完成此項目'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-[#355E30] fill-[#E3F1DF]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#8A7E70]" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div
                            className={`text-xs font-black flex items-center gap-1.5 flex-wrap ${
                              isDone ? 'text-[#2F522B] line-through' : 'text-[#2C241E]'
                            }`}
                          >
                            <span>
                              {idx + 1}. {def.name}
                            </span>
                            {def.hasMetronome180 && (
                              <span className="px-1.5 py-0.5 rounded bg-[#DCE6D8] text-[#355E30] text-[10px] no-underline">
                                ♪ 180節拍
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#6E6459] mt-0.5">{def.subtitle}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-[#2C241E]">
                          {formatDurationLabel(item.durationSec)}
                        </div>
                        <div className="text-[11px] font-black text-[#C83B32]">🔥 {kcal} kcal</div>
                      </div>
                    </div>

                    {/* Action Row: Fine-tune duration + Countdown Play + 1-Tap Check-off */}
                    <div className="flex items-center justify-between gap-2 pl-7 pt-0.5">
                      {!isDone ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustPlanItemSec(item.id, -30)}
                            className="px-1.5 py-0.5 rounded-lg bg-white text-[10px] font-bold text-[#5C5145]"
                            title="減少 30 秒"
                          >
                            -30秒
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustPlanItemSec(item.id, 30)}
                            className="px-1.5 py-0.5 rounded-lg bg-white text-[10px] font-bold text-[#5C5145]"
                            title="增加 30 秒"
                          >
                            +30秒
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-[#355E30]">
                          ✨ 已完成打卡（消耗 {matchedLog?.caloriesBurned ?? kcal} kcal）
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartPlaylist([
                                {
                                  exerciseId: item.exerciseId,
                                  durationSec: item.durationSec,
                                  planItemId: item.id,
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded-xl bg-[#C83B32] text-white text-[11px] font-black flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" /> 配樂跟練
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (!isDone) {
                              soundEngine.unlock();
                              soundEngine.playVictoryFanfare();
                            }
                            onQuickTogglePlanItem(item, matchedLog);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition ${
                            isDone
                              ? 'bg-white border-[#8FBC8B] text-[#355E30]'
                              : 'bg-[#FAF8F3] border-[#D8D2C5] text-[#2C241E] hover:bg-[#F3C85F]/40'
                          }`}
                        >
                          {isDone ? '✓ 已完成' : '✓ 直接打卡'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary CTA: Play All Remaining Uncompleted Items with Music */}
          {uncompletedPlaylist.length > 0 ? (
            <button
              type="button"
              onClick={() => onStartPlaylist(uncompletedPlaylist)}
              className="w-full py-3.5 rounded-2xl bg-[#C83B32] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              配樂跟練剩餘 {uncompletedPlaylist.length} 項（{formatDurationLabel(uncompletedStats.sec)} · 🔥{' '}
              {uncompletedStats.kcal} kcal）
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                onStartPlaylist(
                  activeDailyPlan.items.map((it) => ({
                    exerciseId: it.exerciseId,
                    durationSec: it.durationSec,
                  }))
                )
              }
              className="w-full py-3.5 rounded-2xl bg-[#485F44] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              今日計畫全數完成 🎉 點此可再加練一輪！
            </button>
          )}
        </div>
      ) : plannerMode === 'combo' ? (
        <div className="doodle-card p-4 space-y-4">
          <div>
            <h3 className="font-black text-base text-[#2C241E] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#E0A838]" />
              Quokka ＆ BOBO 的簡短 4 分鐘跟練菜單
            </h3>
            <p className="text-xs text-[#6E6459] mt-0.5">
              主打「手部線條雕塑」與「床上躺練」，每項動作控制在短短 4 分鐘內輕鬆無壓力！
            </p>
          </div>

          {/* 4 Intensity / Quick 4-Min Modes */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: 'quick_4min_arm_bed' as ChallengeIntensity,
                title: '⭐ 黃金 4 分鐘手部＋床上操',
                desc: '4個動作各1分鐘，睡前/追劇秒完成！',
              },
              {
                id: 'gentle_25' as ChallengeIntensity,
                title: '🌱 餐後溫柔消食 (抵銷25%)',
                desc: '每動 4 分鐘・手部＋床上輕鬆配',
              },
              {
                id: 'half_50' as ChallengeIntensity,
                title: '🌤️ 活力半糖挑戰 (抵銷50%)',
                desc: '多組 4 分鐘短動作串聯微出汗',
              },
              {
                id: 'full_100' as ChallengeIntensity,
                title: '🔥 全額熱血挑戰 (100%)',
                desc: '拆成多段 4 分鐘好堅持不枯燥',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIntensity(opt.id)}
                className={`p-3 rounded-2xl border text-left transition ${
                  intensity === opt.id
                    ? 'bg-[#F3C85F] border-[#2C241E]'
                    : 'bg-[#EFECE3] border-transparent'
                }`}
              >
                <div className="text-xs font-black text-[#2C241E]">{opt.title}</div>
                <div className="text-[10px] text-[#5C5145] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* Select Meal when using meal-ratio modes */}
          {intensity !== 'quick_4min_arm_bed' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#4A3F35]">搭配哪一餐換算呢？</label>
              <div className="flex flex-wrap gap-2">
                {todayMeals.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMealId(m.id)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition ${
                      selectedMealId === m.id
                        ? 'bg-[#25385B] text-white border-[#25385B]'
                        : 'bg-white border-[#DAD4C6] text-[#5C5145]'
                    }`}
                  >
                    {m.title.slice(0, 10)} ({m.totalCalories} kcal)
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedMealId('custom')}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition ${
                    selectedMealId === 'custom'
                      ? 'bg-[#25385B] text-white border-[#25385B]'
                      : 'bg-white border-[#DAD4C6] text-[#5C5145]'
                  }`}
                >
                  ✏️ 自訂熱量
                </button>
              </div>

              {selectedMealId === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-[#6E6459]">輸入這餐熱量：</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="500"
                    value={customMealKcalInput}
                    onChange={(e) => setCustomMealKcalInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-24 px-3 py-1.5 rounded-xl border border-[#D8D2C5] bg-white text-sm font-black text-[#C83B32]"
                  />
                  <span className="text-xs text-[#6E6459]">kcal</span>
                </div>
              )}
            </div>
          )}

          {/* Playlist Preview */}
          <div className="rounded-2xl bg-[#EFECE3] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3D342C]">
                共 {autoCombo.items.length} 個動作 · 總計 {formatDurationLabel(autoComboStats.totalSec)}
              </span>
              <span className="text-sm font-black text-[#C83B32]">
                預計消耗 🔥 {autoComboStats.totalKcal} kcal
              </span>
            </div>

            <div className="space-y-2">
              {autoCombo.items.map((item, idx) => {
                const def = getExerciseById(item.exerciseId);
                const kcal = calculateExerciseCalories(def.met, weightKg, item.durationSec);
                return (
                  <div
                    key={`${item.exerciseId}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F3]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F3C85F] text-[#2C241E] text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-black text-[#2C241E] flex items-center gap-1">
                          {def.name}
                          {def.hasMetronome180 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#DCE6D8] text-[#355E30] text-[10px]">
                              ♪ 180節拍
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6E6459]">{def.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-black text-[#2C241E]">
                        {formatDurationLabel(item.durationSec)}
                      </div>
                      <div className="text-[10px] text-[#C83B32] font-bold">{kcal} kcal</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartPlaylist(autoCombo.items, activeMeal?.id)}
            className="w-full py-3.5 rounded-2xl bg-[#C83B32] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            跟著 Quokka ＆ BOBO 開始倒數跟練！
          </button>
        </div>
      ) : (
        /* === Mode 2: 4-Minute Arm & Bed Gallery + Pick & Mix === */
        <div className="space-y-4">
          <div className="doodle-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-[#2C241E]">🛒 我的 4 分鐘自選湊單籃</h3>
                <p className="text-xs text-[#6E6459]">點下方動作即可單獨練 4 分鐘，或加入湊單籃串著練！</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#6E6459]">目標</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="60"
                  value={pickTargetKcalInput}
                  onChange={(e) => setPickTargetKcalInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-16 px-2 py-1 rounded-xl border border-[#D8D2C5] bg-white text-xs font-black text-center text-[#C83B32]"
                />
                <span className="text-xs text-[#6E6459]">kcal</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#4A3F35]">
                  已選 {cart.length} 個動作（共 {formatDurationLabel(cartStats.totalSec)}）
                </span>
                <span className="text-[#C83B32]">
                  <Flame className="w-3.5 h-3.5 inline mr-0.5" />
                  {cartStats.totalKcal} / {pickTargetKcal} kcal
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#DAD4C6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6D8B67] to-[#C83B32] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((cartStats.totalKcal / Math.max(1, pickTargetKcal)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {cart.length > 0 && (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {cart.map((item) => {
                  const def = getExerciseById(item.exerciseId);
                  const kcal = calculateExerciseCalories(def.met, weightKg, item.durationSec);
                  return (
                    <div
                      key={item.exerciseId}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#EFECE3]"
                    >
                      <div className="text-xs font-bold text-[#2C241E]">
                        {def.name}{' '}
                        <span className="text-[#C83B32] font-black">({kcal} kcal)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustCartDuration(item.exerciseId, -60)}
                          className="p-1 rounded-lg bg-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black w-14 text-center">
                          {formatDurationLabel(item.durationSec)}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustCartDuration(item.exerciseId, 60)}
                          className="p-1 rounded-lg bg-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCartDuration(item.exerciseId, -9999)}
                          className="p-1 text-[#B07268]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => onStartPlaylist(cart)}
              className="w-full py-3 rounded-2xl bg-[#25385B] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              開始執行湊單跟練（{formatDurationLabel(cartStats.totalSec)}）
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all' as const, label: '✨ 全部 4分鐘動作 (13)' },
              { id: 'arm_sculpt' as const, label: '💪 手部線條＆天鵝臂 (4)' },
              { id: 'bed_workout' as const, label: '🛏️ 床上躺練專區 (5)' },
              { id: 'post_meal_silent' as const, label: '🧘‍♀️ 餐後消食＆靜音 (4)' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterCat(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  filterCat === f.id
                    ? 'bg-[#2C241E] text-white'
                    : 'bg-[#FAF8F3] text-[#4A3F35] border border-[#DDD7C9]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Animated 4-Minute Pose Cards Gallery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {visibleExercises.map((ex) => {
              const kcalPer4Min = calculateExerciseCalories(ex.met, weightKg, ex.defaultDurationSec);
              return (
                <div
                  key={ex.id}
                  className="doodle-card p-3.5 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <ExerciseAnimationStage exerciseId={ex.id} className="w-full h-40" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-sm text-[#2C241E] flex items-center gap-1">
                          {ex.name}
                          {ex.hasMetronome180 && (
                            <Music className="w-3.5 h-3.5 text-[#485F44]" />
                          )}
                        </h4>
                        <p className="text-[11px] text-[#6E6459] mt-0.5">{ex.subtitle}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#F3C85F]/40 text-[#7A5116] text-[11px] font-black shrink-0">
                        4分鐘 ≈ {kcalPer4Min} kcal
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ex.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-[#EFECE3] text-[10px] font-bold text-[#5C5145]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onStartPlaylist([
                          { exerciseId: ex.id, durationSec: ex.defaultDurationSec },
                        ])
                      }
                      className="flex-1 py-2.5 rounded-xl bg-[#C83B32] text-xs font-black text-white flex items-center justify-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> 練這項 4 分鐘
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(ex.id, ex.defaultDurationSec)}
                      className="px-3 py-2.5 rounded-xl bg-[#F3C85F] text-xs font-black text-[#2C241E] flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> 湊單
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
