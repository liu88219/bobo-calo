import React, { useMemo, useState } from 'react';
import { Play, Plus, Minus, Sparkles, Flame, Trash2, Music } from 'lucide-react';
import {
  MealLog,
  WorkoutPlaylistItem,
  calculateExerciseCalories,
} from '../types/tracker';
import {
  EXERCISES,
  ChallengeIntensity,
  buildMealChallengePlaylist,
  getExerciseById,
} from '../data/exercises';
import { ExerciseAnimationStage } from './QuokkaBoboArt';

interface Props {
  todayMeals: MealLog[];
  weightKg: number;
  initialFocusMeal?: MealLog | null;
  onStartPlaylist: (playlist: WorkoutPlaylistItem[], sourceMealId?: string) => void;
}

export const WorkoutPlannerView: React.FC<Props> = ({
  todayMeals,
  weightKg,
  initialFocusMeal,
  onStartPlaylist,
}) => {
  const [plannerMode, setPlannerMode] = useState<'combo' | 'pick'>('combo');
  const [selectedMealId, setSelectedMealId] = useState<string>(
    initialFocusMeal?.id || todayMeals[0]?.id || 'custom'
  );
  const [customMealKcal, setCustomMealKcal] = useState<number>(500);
  const [intensity, setIntensity] = useState<ChallengeIntensity>('gentle_25');

  // Mode 2: Pick & Mix Cart
  const [pickTargetKcal, setPickTargetKcal] = useState<number>(
    initialFocusMeal ? Math.max(40, Math.round(initialFocusMeal.totalCalories * 0.25)) : 100
  );
  const [filterCat, setFilterCat] = useState<'all' | 'silent_home' | 'post_meal_yoga'>('all');
  const [cart, setCart] = useState<WorkoutPlaylistItem[]>([
    { exerciseId: 'slow_jogging_180', durationSec: 180 },
    { exerciseId: 'slow_squat', durationSec: 60 },
    { exerciseId: 'cat_cow', durationSec: 60 },
  ]);

  const activeMeal = useMemo(
    () => todayMeals.find((m) => m.id === selectedMealId) || null,
    [todayMeals, selectedMealId]
  );

  const baseMealCalories = activeMeal ? activeMeal.totalCalories : Math.max(50, customMealKcal || 400);

  const autoCombo = useMemo(
    () => buildMealChallengePlaylist(baseMealCalories, weightKg, intensity),
    [baseMealCalories, weightKg, intensity]
  );

  const autoComboStats = useMemo(() => {
    const totalSec = autoCombo.items.reduce((s, x) => s + x.durationSec, 0);
    const totalKcal = autoCombo.items.reduce(
      (s, x) => s + calculateExerciseCalories(getExerciseById(x.exerciseId).met, weightKg, x.durationSec),
      0
    );
    return { totalSec, totalKcal };
  }, [autoCombo, weightKg]);

  const cartStats = useMemo(() => {
    const totalSec = cart.reduce((s, x) => s + x.durationSec, 0);
    const totalKcal = cart.reduce(
      (s, x) => s + calculateExerciseCalories(getExerciseById(x.exerciseId).met, weightKg, x.durationSec),
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
        .filter((x) => x.durationSec >= 15)
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
      {/* Mode Switcher */}
      <div className="doodle-card p-3">
        <div className="flex rounded-2xl bg-[#FAF4EB] p-1 border border-[#E5CFB3]">
          <button
            type="button"
            onClick={() => setPlannerMode('combo')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition ${
              plannerMode === 'combo'
                ? 'bg-[#BA7E4D] text-white shadow-sm'
                : 'text-[#5C3F2D]'
            }`}
          >
            🍱 餐後智慧組合菜單
          </button>
          <button
            type="button"
            onClick={() => setPlannerMode('pick')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition ${
              plannerMode === 'pick'
                ? 'bg-[#8FBC8B] text-white shadow-sm'
                : 'text-[#5C3F2D]'
            }`}
          >
            🛒 自由湊單＆動作圖鑑
          </button>
        </div>
      </div>

      {plannerMode === 'combo' ? (
        /* === Mode 1: Meal-paired Automatic Workout Playlist === */
        <div className="doodle-card p-4 space-y-4">
          <div>
            <h3 className="font-black text-base text-[#422B1D] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#F4B860]" />
              矮袋鼠幫妳配好的餐後挑戰菜單
            </h3>
            <p className="text-xs text-[#7C5841] mt-0.5">
              選擇今天吃的一餐，自動串聯「超慢跑消食 ➜ 靜音雕塑 ➜ 瑜珈伸展」動態倒數跟練！
            </p>
          </div>

          {/* Select Meal or Custom Kcal */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#5C3F2D]">搭配哪一餐呢？</label>
            <div className="flex flex-wrap gap-2">
              {todayMeals.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMealId(m.id)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold border-2 transition ${
                    selectedMealId === m.id
                      ? 'bg-[#FFF3DF] border-[#422B1D] text-[#422B1D]'
                      : 'bg-white border-[#EAD8C0] text-[#7C5841]'
                  }`}
                >
                  {m.title.slice(0, 10)} ({m.totalCalories} kcal)
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedMealId('custom')}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold border-2 transition ${
                  selectedMealId === 'custom'
                    ? 'bg-[#FFF3DF] border-[#422B1D] text-[#422B1D]'
                    : 'bg-white border-[#EAD8C0] text-[#7C5841]'
                }`}
              >
                ✏️ 自訂餐點熱量
              </button>
            </div>

            {selectedMealId === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-[#7C5841]">輸入這餐熱量：</span>
                <input
                  type="number"
                  value={customMealKcal}
                  onChange={(e) => setCustomMealKcal(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-sm font-black text-[#BA7E4D]"
                />
                <span className="text-xs text-[#7C5841]">kcal</span>
              </div>
            )}
          </div>

          {/* Intensity Selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'gentle_25' as ChallengeIntensity,
                title: '🌱 輕鬆消食 25%',
                desc: '推薦！無負擔好堅持',
              },
              {
                id: 'half_50' as ChallengeIntensity,
                title: '🌤️ 活力半糖 50%',
                desc: '流點微汗超舒暢',
              },
              {
                id: 'full_100' as ChallengeIntensity,
                title: '🔥 100% 全消挑戰',
                desc: '超熱血燃燒全餐',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIntensity(opt.id)}
                className={`p-2.5 rounded-2xl border-2 text-left transition ${
                  intensity === opt.id
                    ? 'bg-[#F5E6D3] border-[#422B1D]'
                    : 'bg-white border-[#EAD8C0]'
                }`}
              >
                <div className="text-xs font-black text-[#422B1D]">{opt.title}</div>
                <div className="text-[10px] text-[#7C5841] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* Playlist Preview */}
          <div className="rounded-2xl bg-[#FAF4EB] p-3.5 border border-[#E5CFB3] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5C3F2D]">
                共 {autoCombo.items.length} 個動作 · 約 {formatDurationLabel(autoComboStats.totalSec)}
              </span>
              <span className="text-sm font-black text-[#BA7E4D]">
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
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EAD8C0]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F5E6D3] text-[#422B1D] text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-black text-[#422B1D] flex items-center gap-1">
                          {def.name}
                          {def.hasMetronome180 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#E3F1DF] text-[#355E30] text-[10px]">
                              ♪ 180節拍
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#7C5841]">{def.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-black text-[#422B1D]">
                        {formatDurationLabel(item.durationSec)}
                      </div>
                      <div className="text-[10px] text-[#BA7E4D] font-bold">{kcal} kcal</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartPlaylist(autoCombo.items, activeMeal?.id)}
            className="w-full py-3.5 rounded-2xl bg-[#BA7E4D] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            跟著矮袋鼠與 Bobo 開始倒數跟練！
          </button>
        </div>
      ) : (
        /* === Mode 2: Pick & Mix Custom Basket + Animated Pose Gallery === */
        <div className="space-y-4">
          {/* Sticky Basket Summary */}
          <div className="doodle-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-[#422B1D]">🛒 我的自選運動湊單籃</h3>
                <p className="text-xs text-[#7C5841]">自由挑選今天想做的動作湊滿目標卡路里！</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#7C5841]">目標</span>
                <input
                  type="number"
                  value={pickTargetKcal}
                  onChange={(e) => setPickTargetKcal(Math.max(10, Number(e.target.value)))}
                  className="w-16 px-2 py-1 rounded-xl border border-[#DFC8AC] bg-white text-xs font-black text-center text-[#BA7E4D]"
                />
                <span className="text-xs text-[#7C5841]">kcal</span>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#5C3F2D]">
                  已湊 {cart.length} 個動作（{formatDurationLabel(cartStats.totalSec)}）
                </span>
                <span className="text-[#BA7E4D]">
                  <Flame className="w-3.5 h-3.5 inline mr-0.5" />
                  {cartStats.totalKcal} / {pickTargetKcal} kcal
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#EAD8C0] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8FBC8B] to-[#BA7E4D] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((cartStats.totalKcal / Math.max(1, pickTargetKcal)) * 100))}%`,
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
                      className="flex items-center justify-between p-2 rounded-xl bg-[#FAF4EB] border border-[#E5CFB3]"
                    >
                      <div className="text-xs font-bold text-[#422B1D]">
                        {def.name}{' '}
                        <span className="text-[#BA7E4D] font-black">({kcal} kcal)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustCartDuration(item.exerciseId, -30)}
                          className="p-1 rounded-lg bg-white border border-[#DFC8AC]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black w-14 text-center">
                          {formatDurationLabel(item.durationSec)}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustCartDuration(item.exerciseId, 30)}
                          className="p-1 rounded-lg bg-white border border-[#DFC8AC]"
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
              className="w-full py-3 rounded-2xl bg-[#8FBC8B] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              開始執行我的湊單跟練（{formatDurationLabel(cartStats.totalSec)}）
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            {[
              { id: 'all' as const, label: '✨ 全部動作 (11)' },
              { id: 'silent_home' as const, label: '🏠 居家靜音不傷膝' },
              { id: 'post_meal_yoga' as const, label: '🧘‍♀️ 餐後消食＆瑜珈' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterCat(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  filterCat === f.id
                    ? 'bg-[#422B1D] text-white border-[#422B1D]'
                    : 'bg-white text-[#5C3F2D] border-[#DFC8AC]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Animated Pose Cards Gallery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {visibleExercises.map((ex) => {
              const kcalPer3Min = calculateExerciseCalories(ex.met, weightKg, 180);
              return (
                <div key={ex.id} className="doodle-card p-3.5 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <ExerciseAnimationStage exerciseId={ex.id} className="w-full h-36" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-sm text-[#422B1D] flex items-center gap-1">
                          {ex.name}
                          {ex.hasMetronome180 && (
                            <Music className="w-3.5 h-3.5 text-[#355E30]" />
                          )}
                        </h4>
                        <p className="text-[11px] text-[#7C5841] mt-0.5">{ex.subtitle}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF3DF] text-[#BA7E4D] text-[11px] font-black shrink-0">
                        3分鐘 ≈ {kcalPer3Min} kcal
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ex.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-[#FAF4EB] border border-[#E5CFB3] text-[10px] font-bold text-[#7C5841]"
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
                      className="flex-1 py-2 rounded-xl bg-[#FAF4EB] border border-[#422B1D] text-xs font-bold text-[#422B1D] flex items-center justify-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> 單項跟練
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(ex.id, ex.defaultDurationSec)}
                      className="flex-1 py-2 rounded-xl bg-[#F4B860] border border-[#422B1D] text-xs font-black text-[#422B1D] flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> 加入湊單
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
