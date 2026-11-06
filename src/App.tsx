import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Trash2,
  BookOpen,
  CalendarHeart,
  Lock,
  Sparkles,
  PencilLine,
} from 'lucide-react';
import {
  VaultState,
  MealLog,
  WorkoutLog,
  WaterLog,
  WorkoutPlaylistItem,
  UserProfile,
  MEAL_CATEGORY_META,
  createInitialVaultState,
  getLocalDateKey,
  calculateDailyCalorieBudget,
} from './types/tracker';
import { getDailyGreeting } from './data/praiseMessages';
import {
  requestPersistentStorage,
  loadLocalVaultSync,
  loadLocalVaultState,
  saveLocalVaultState,
  loadRememberedPasscodeSync,
  loadRememberedPasscode,
  saveRememberedPasscode,
  syncWithCloudVault,
  subscribeRealtimeRelay,
  getLocalHiResPhoto,
  exportBackupJson,
  mergeVaultStates,
} from './services/cloudSync';
import { MascotDuoIllustration, MarshmallowStampBadge } from './components/QuokkaBoboArt';
import { WaterTrackerCard } from './components/WaterTrackerCard';
import { MealLoggerModal } from './components/MealLoggerModal';
import { WorkoutPlannerView } from './components/WorkoutPlannerView';
import { WorkoutPlayerModal } from './components/WorkoutPlayerModal';
import { SettingsVaultModal } from './components/SettingsVaultModal';

const MealPhotoDisplay: React.FC<{ meal: MealLog }> = ({ meal }) => {
  const [hiRes, setHiRes] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (meal.hasLocalHiResPhoto) {
      getLocalHiResPhoto(meal.id).then((res) => {
        if (active && res) setHiRes(res);
      });
    }
    return () => {
      active = false;
    };
  }, [meal.id, meal.hasLocalHiResPhoto, meal.updatedAt]);

  const src = hiRes || meal.photoThumb;
  if (!src) return null;
  return (
    <img
      src={src}
      alt={meal.title}
      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E5CFB3] shrink-0 bg-[#FAF4EB]"
    />
  );
};

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return getLocalDateKey(dt);
}

export const App: React.FC = () => {
  const [vault, setVault] = useState<VaultState>(() => loadLocalVaultSync());
  const [passcode, setPasscode] = useState<string>(() => loadRememberedPasscodeSync());
  const [quickPassInput, setQuickPassInput] = useState<string>('');
  const [booted, setBooted] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateKey());
  const [activeNav, setActiveNav] = useState<'diary' | 'workout' | 'history'>('diary');

  // Modals & Active Flows
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [focusMealForWorkout, setFocusMealForWorkout] = useState<MealLog | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<{
    items: WorkoutPlaylistItem[];
    sourceMealId?: string;
  } | null>(null);

  const vaultRef = useRef(vault);
  vaultRef.current = vault;
  const passcodeRef = useRef(passcode);
  passcodeRef.current = passcode;
  const syncInFlightRef = useRef(false);
  const pendingSyncRef = useRef<{ pass: string; forcePush: boolean; showToast: boolean } | null>(
    null
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(''), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const triggerCloudSync = useCallback(
    async (baseState: VaultState, pass: string, showSuccessToast = false, forcePush = false) => {
      const cleanPass = pass.trim();
      if (!cleanPass) return baseState;

      // 若上一輪同步仍在進行中，排入佇列避免背景舊請求覆蓋剛新增的紀錄！
      if (syncInFlightRef.current) {
        pendingSyncRef.current = {
          pass: cleanPass,
          forcePush: Boolean(pendingSyncRef.current?.forcePush || forcePush),
          showToast: Boolean(pendingSyncRef.current?.showToast || showSuccessToast),
        };
        return vaultRef.current;
      }

      syncInFlightRef.current = true;
      setSyncBusy(true);

      let latestMerged = mergeVaultStates(vaultRef.current, baseState);
      try {
        const outcome = await syncWithCloudVault(latestMerged, cleanPass, forcePush);
        if (outcome.ok) {
          setVault((prev) => {
            const safeMerged = mergeVaultStates(prev, outcome.mergedState);
            latestMerged = safeMerged;
            vaultRef.current = safeMerged;
            void saveLocalVaultState(safeMerged);
            return safeMerged;
          });
          if (showSuccessToast) {
            showToast('☁️ Bobo 已幫妳同步最新雲端紀錄囉！');
          }
        } else if (showSuccessToast && outcome.errorMessage) {
          showToast(`⚠️ ${outcome.errorMessage}`);
        }
      } finally {
        syncInFlightRef.current = false;
        setSyncBusy(false);

        const nextPending = pendingSyncRef.current;
        if (nextPending) {
          pendingSyncRef.current = null;
          void triggerCloudSync(
            vaultRef.current,
            nextPending.pass,
            nextPending.showToast,
            nextPending.forcePush
          );
        }
      }
      return latestMerged;
    },
    [showToast]
  );

  // Boot: request persistent storage, merge localStorage + IndexedDB + orphan photos, then pull cloud
  useEffect(() => {
    let mounted = true;
    (async () => {
      await requestPersistentStorage();
      const [localState, savedPass] = await Promise.all([
        loadLocalVaultState(),
        loadRememberedPasscode(),
      ]);
      if (!mounted) return;
      let mergedBootState = localState;
      setVault((prev) => {
        mergedBootState = mergeVaultStates(prev, localState);
        vaultRef.current = mergedBootState;
        return mergedBootState;
      });
      if (savedPass) {
        setPasscode(savedPass);
        passcodeRef.current = savedPass;
      }
      setBooted(true);

      if (savedPass) {
        await triggerCloudSync(mergedBootState, savedPass, false, !mergedBootState.isUneditedDefault);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [triggerCloudSync]);

  // Foreground wake-up auto sync (Safari <-> iPhone Home Screen App) + ntfy.sh realtime relay
  useEffect(() => {
    if (!booted || !passcode.trim()) return;

    const handleWakeSync = () => {
      if (document.visibilityState === 'visible') {
        void triggerCloudSync(vaultRef.current, passcodeRef.current, false, false);
      }
    };

    const onFocus = () => {
      void triggerCloudSync(vaultRef.current, passcodeRef.current, false, false);
    };

    document.addEventListener('visibilitychange', handleWakeSync);
    window.addEventListener('focus', onFocus);
    const unsubRelay = subscribeRealtimeRelay(passcode, () => {
      void triggerCloudSync(vaultRef.current, passcodeRef.current, false, false);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleWakeSync);
      window.removeEventListener('focus', onFocus);
      unsubRelay();
    };
  }, [booted, passcode, triggerCloudSync]);

  const commitVaultUpdate = useCallback(
    (updater: (prev: VaultState) => VaultState) => {
      setVault((prev) => {
        const next = updater(prev);
        vaultRef.current = next;
        void saveLocalVaultState(next);
        if (passcodeRef.current.trim()) {
          void triggerCloudSync(next, passcodeRef.current, false, true);
        }
        return next;
      });
    },
    [triggerCloudSync]
  );

  const handleBindPasscode = async (rawPass: string): Promise<{ ok: boolean; msg: string }> => {
    const clean = rawPass.trim();
    if (!clean) return { ok: false, msg: '請輸入通行碼喔' };
    setSyncBusy(true);
    const outcome = await syncWithCloudVault(
      vaultRef.current,
      clean,
      !vaultRef.current.isUneditedDefault
    );
    setSyncBusy(false);
    if (outcome.ok) {
      setPasscode(clean);
      passcodeRef.current = clean;
      await saveRememberedPasscode(clean);
      setVault((prev) => {
        const safeMerged = mergeVaultStates(prev, outcome.mergedState);
        vaultRef.current = safeMerged;
        void saveLocalVaultState(safeMerged);
        return safeMerged;
      });
      showToast('🔐 通行碼已綁定！Safari 與主畫面已開啟自動同步 ✨');
      return {
        ok: true,
        msg: outcome.pulledFromCloud
          ? '✅ 已成功拉取並合併雲端紀錄！'
          : '✅ 已建立專屬加密雲端空間並啟動同步！',
      };
    }
    return { ok: false, msg: outcome.errorMessage || '同步連線失敗，請確認通行碼是否正確' };
  };

  // Handlers for Meals, Water, Workouts, Settings
  const handleSaveMeal = (meal: MealLog, launchExerciseAfter: boolean) => {
    const now = Date.now();
    const wasEditing = vault.meals.some((m) => m.id === meal.id);
    commitVaultUpdate((prev) => {
      const exists = prev.meals.some((m) => m.id === meal.id);
      return {
        ...prev,
        updatedAt: now,
        isUneditedDefault: false,
        meals: exists
          ? prev.meals.map((m) => (m.id === meal.id ? meal : m))
          : [meal, ...prev.meals],
      };
    });
    setEditingMeal(null);
    setShowMealModal(false);
    setSelectedDate(meal.dateKey);

    if (launchExerciseAfter) {
      setFocusMealForWorkout(meal);
      setActiveNav('workout');
      showToast('🦘 已幫妳配好這餐的溫柔消食運動菜單囉！');
    } else if (wasEditing) {
      showToast('✨ 已幫妳更新餐點並同步最新卡路里囉 🤎');
    } else {
      showToast('🍱 餐點紀錄完成！好好吃飯的妳最棒了 🤎');
    }
  };

  const handleDeleteMeal = (id: string) => {
    const now = Date.now();
    commitVaultUpdate((prev) => ({
      ...prev,
      updatedAt: now,
      isUneditedDefault: false,
      meals: prev.meals.filter((m) => m.id !== id),
      deletedIds: { ...prev.deletedIds, [id]: now },
    }));
    showToast('已移除該筆餐點紀錄');
  };

  const handleAddWater = (amountMl: number, label: string) => {
    const now = Date.now();
    const newEntry: WaterLog = {
      id: `water-${now}-${Math.random().toString(36).slice(2, 6)}`,
      dateKey: selectedDate,
      amountMl,
      label,
      createdAt: now,
    };
    commitVaultUpdate((prev) => ({
      ...prev,
      updatedAt: now,
      isUneditedDefault: false,
      waters: [newEntry, ...prev.waters],
    }));
    showToast(`💧 咕嚕咕嚕 +${amountMl}ml！Bobo 替妳拍拍手 🤍`);
  };

  const handleDeleteWater = (id: string) => {
    const now = Date.now();
    commitVaultUpdate((prev) => ({
      ...prev,
      updatedAt: now,
      isUneditedDefault: false,
      waters: prev.waters.filter((w) => w.id !== id),
      deletedIds: { ...prev.deletedIds, [id]: now },
    }));
  };

  const handleCompleteWorkout = useCallback(
    (
      completedItems: Array<{
        exerciseId: string;
        exerciseName: string;
        durationSec: number;
        caloriesBurned: number;
        sourceMealId?: string;
      }>
    ) => {
      const now = Date.now();
      const dateKey = selectedDate;
      const newLogs: WorkoutLog[] = completedItems.map((item, idx) => ({
        id: `wo-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        dateKey,
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        durationSec: item.durationSec,
        caloriesBurned: item.caloriesBurned,
        sourceMealId: item.sourceMealId,
        createdAt: now + idx,
      }));
      commitVaultUpdate((prev) => ({
        ...prev,
        updatedAt: now,
        isUneditedDefault: false,
        workouts: [...newLogs, ...prev.workouts],
        stamps: Array.from(new Set([...prev.stamps, dateKey])),
      }));
    },
    [commitVaultUpdate, selectedDate]
  );

  const handleDeleteWorkout = (id: string) => {
    const now = Date.now();
    commitVaultUpdate((prev) => ({
      ...prev,
      updatedAt: now,
      isUneditedDefault: false,
      workouts: prev.workouts.filter((w) => w.id !== id),
      deletedIds: { ...prev.deletedIds, [id]: now },
    }));
  };

  const handleSaveProfileAndKey = (nextProfile: UserProfile, nextApiKey: string) => {
    const now = Date.now();
    commitVaultUpdate((prev) => ({
      ...prev,
      updatedAt: now,
      settingsUpdatedAt: now,
      isUneditedDefault: false,
      profile: nextProfile,
      geminiApiKey: nextApiKey,
    }));
    showToast('✨ 個人小檔案與設定已儲存並加密同步！');
  };

  const handleImportBackup = (imported: Partial<VaultState>) => {
    const now = Date.now();
    commitVaultUpdate((prev) => {
      const candidate: VaultState = {
        ...createInitialVaultState(),
        ...imported,
        geminiApiKey: imported.geminiApiKey || prev.geminiApiKey,
        updatedAt: now,
        isUneditedDefault: false,
      };
      const merged = mergeVaultStates(prev, candidate);
      return { ...merged, updatedAt: now, isUneditedDefault: false };
    });
    showToast('📦 備份資料已成功合併匯入！');
  };

  // Filtered daily stats
  const todayKey = getLocalDateKey();
  const dayMeals = useMemo(
    () => vault.meals.filter((m) => m.dateKey === selectedDate),
    [vault.meals, selectedDate]
  );
  const dayWorkouts = useMemo(
    () => vault.workouts.filter((w) => w.dateKey === selectedDate),
    [vault.workouts, selectedDate]
  );
  const dayWaters = useMemo(
    () => vault.waters.filter((w) => w.dateKey === selectedDate),
    [vault.waters, selectedDate]
  );

  const dailyBudget = useMemo(() => calculateDailyCalorieBudget(vault.profile), [vault.profile]);
  const eatenKcal = useMemo(
    () => dayMeals.reduce((s, m) => s + m.totalCalories, 0),
    [dayMeals]
  );
  const burnedKcal = useMemo(
    () => dayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0),
    [dayWorkouts]
  );
  const macros = useMemo(() => {
    return {
      p: Math.round(dayMeals.reduce((s, m) => s + m.proteinG, 0)),
      c: Math.round(dayMeals.reduce((s, m) => s + m.carbsG, 0)),
      f: Math.round(dayMeals.reduce((s, m) => s + m.fatG, 0)),
    };
  }, [dayMeals]);

  const remainingKcal = dailyBudget - eatenKcal + burnedKcal;
  const budgetPct = Math.min(
    100,
    Math.max(0, Math.round((eatenKcal / Math.max(1, dailyBudget + burnedKcal)) * 100))
  );
  const greeting = useMemo(
    () => getDailyGreeting(vault.profile.nickname),
    [vault.profile.nickname]
  );

  const recent7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dk = shiftDateKey(todayKey, -i);
      const mKcal = vault.meals
        .filter((m) => m.dateKey === dk)
        .reduce((s, x) => s + x.totalCalories, 0);
      const wKcal = vault.workouts
        .filter((w) => w.dateKey === dk)
        .reduce((s, x) => s + x.caloriesBurned, 0);
      const wtMl = vault.waters
        .filter((wt) => wt.dateKey === dk)
        .reduce((s, x) => s + x.amountMl, 0);
      const hasStamp = vault.stamps.includes(dk);
      return { dk, mKcal, wKcal, wtMl, hasStamp };
    });
  }, [todayKey, vault.meals, vault.workouts, vault.waters, vault.stamps]);

  return (
    <div className="min-h-screen pb-24">
      {/* Top Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#422B1D] text-[#FFFDF9] text-xs font-bold shadow-lg whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#E8E4DA]/90 backdrop-blur-md border-b border-[#D8D2C5]">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="./icon-192.png?v=4"
              alt="BoboCalo"
              className="w-10 h-10 rounded-xl shadow-sm border border-[#DDD7C9] object-cover"
            />
            <div>
              <h1 className="font-black text-base leading-tight text-[#2C241E]">BoboCalo</h1>
              <p className="text-[11px] text-[#6E6459]">
                Marsh 棉花糖塔 × {vault.stamps.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={syncBusy}
              onClick={() => {
                if (!passcode.trim()) {
                  setShowSettingsModal(true);
                  return;
                }
                void triggerCloudSync(vault, passcode, true, true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F3] border border-[#D8D2C5] text-xs font-bold text-[#3D342C] active:scale-95 transition"
              title="立即與雲端對齊最新紀錄"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? 'animate-spin text-[#C83B32]' : ''}`} />
              <span>雲端同步</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="relative p-2 rounded-full bg-[#FAF8F3] border border-[#D8D2C5] text-[#3D342C]"
              title="個人檔案與 API Key 設定"
            >
              <Settings className="w-4 h-4" />
              {!passcode.trim() && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C83B32] border border-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Quick Cloud Sync Passcode Banner when not yet unlocked on this browser */}
        {!passcode.trim() && (
          <div className="doodle-card p-3.5 bg-[#FFF6E8] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#5C3F2D]">
              <Lock className="w-3.5 h-3.5 text-[#BA7E4D]" />
              <span>設定專屬通行碼：自動同步 Safari ↔ iPhone「加入主畫面」</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={quickPassInput}
                onChange={(e) => setQuickPassInput(e.target.value)}
                placeholder="輸入自訂通行碼解鎖／建立雲端同步"
                className="flex-1 px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              />
              <button
                type="button"
                onClick={() => void handleBindPasscode(quickPassInput)}
                className="px-3.5 py-1.5 rounded-xl bg-[#BA7E4D] text-white text-xs font-bold doodle-btn"
              >
                啟用同步
              </button>
            </div>
          </div>
        )}

        {/* Date Selector Bar */}
        <div className="flex items-center justify-between bg-[#FFFDF9] rounded-2xl px-3 py-2 border-2 border-[#E5CFB3]">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => shiftDateKey(d, -1))}
            className="p-1.5 rounded-xl hover:bg-[#FAF4EB] text-[#5C3F2D]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <span className="text-xs font-black text-[#422B1D]">
              {selectedDate === todayKey ? `📅 今天 (${selectedDate})` : `📅 ${selectedDate}`}
            </span>
            {selectedDate !== todayKey && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayKey)}
                className="ml-2 px-2 py-0.5 rounded-full bg-[#F5E6D3] text-[10px] font-bold text-[#5C3F2D]"
              >
                回今天
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => shiftDateKey(d, 1))}
            className="p-1.5 rounded-xl hover:bg-[#FAF4EB] text-[#5C3F2D]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {activeNav === 'diary' && (
          <>
            {/* Signature DINOTAENG Butterscotch Yellow Hero Scene (Quokka + BOBO + Marsh Stack!) */}
            <div className="doodle-card overflow-hidden">
              <div className="bg-[#F3C85F] px-4 pt-4 pb-3 flex items-center gap-3">
                <MascotDuoIllustration
                  mood={burnedKcal > 0 ? 'proud' : dayMeals.length > 0 ? 'eating' : 'greeting'}
                  className="w-40 h-28 shrink-0"
                />
                <div className="space-y-1">
                  <h2 className="font-black text-base text-[#231B15]">{greeting.title}</h2>
                  <p className="text-xs text-[#3E3022] leading-relaxed font-medium">
                    {greeting.message}
                  </p>
                </div>
              </div>

              {/* Daily Calorie Budget & Exercise Offset */}
              <div className="p-4 space-y-3.5">
                <div className="rounded-2xl bg-[#EFECE3] p-3.5 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[11px] text-[#6E6459]">今日已吃</div>
                      <div className="text-lg font-black text-[#2C241E]">{eatenKcal}</div>
                      <div className="text-[10px] text-[#8A7F72]">預算 {dailyBudget}</div>
                    </div>
                    <div className="border-x border-[#DAD4C6]">
                      <div className="text-[11px] text-[#6E6459]">運動加分</div>
                      <div className="text-lg font-black text-[#485F44]">+{burnedKcal}</div>
                      <div className="text-[10px] text-[#8A7F72]">kcal 消耗</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#6E6459]">
                        {remainingKcal >= 0 ? '安心剩餘額度' : '豐盛幸福能量'}
                      </div>
                      <div className="text-lg font-black text-[#C83B32]">
                        {remainingKcal >= 0 ? remainingKcal : `+${Math.abs(remainingKcal)}`}
                      </div>
                      <div className="text-[10px] text-[#8A7F72]">kcal</div>
                    </div>
                  </div>

                  {/* Gentle Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-[#DAD4C6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6D8B67] via-[#E5B344] to-[#C83B32] transition-all duration-500"
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6E6459]">
                    <span>
                      🥩 蛋白質 {macros.p}g · 🍚 碳水 {macros.c}g · 🥑 脂肪 {macros.f}g
                    </span>
                    {vault.stamps.includes(selectedDate) && (
                      <MarshmallowStampBadge label="今日 Marsh 已疊高" />
                    )}
                  </div>

                  {remainingKcal < 0 && (
                    <div className="p-2.5 rounded-xl bg-[#FAF8F3] text-xs text-[#3D342C] flex items-center justify-between gap-2">
                      <span>
                        🤎 今天吃得好滿足沒關係！要不要跟 Quokka ＆ BOBO 一起動個 5 分鐘消化一下呀？
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveNav('workout')}
                        className="px-2.5 py-1 rounded-lg bg-[#25385B] text-white font-bold shrink-0"
                      >
                        去動動
                      </button>
                    </div>
                  )}
                </div>

                {/* Big Primary CTA in DINOTAENG Vintage Tomato Red */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingMeal(null);
                    setShowMealModal(true);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#C83B32] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  拍下美食／描述這餐算卡路里 📸
                </button>
              </div>
            </div>

            {/* Water Tracker Card */}
            <WaterTrackerCard
              todayWaters={dayWaters}
              targetMl={vault.profile.dailyWaterTargetMl}
              onAddWater={handleAddWater}
              onDeleteWater={handleDeleteWater}
            />

            {/* Meal Logs List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-black text-sm text-[#422B1D]">
                  🍽️ 餐點日記 ({dayMeals.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMeal(null);
                    setShowMealModal(true);
                  }}
                  className="text-xs font-bold text-[#BA7E4D]"
                >
                  + 新增一餐
                </button>
              </div>

              {dayMeals.length === 0 ? (
                <div className="doodle-card p-6 text-center space-y-2">
                  <div className="text-2xl">🥐🍱🧋</div>
                  <p className="text-xs font-bold text-[#5C3F2D]">
                    這天還沒有餐點紀錄喔～拍張照跟矮袋鼠還有 Bobo 分享妳吃了什麼吧！
                  </p>
                </div>
              ) : (
                dayMeals.map((meal) => {
                  const catMeta = MEAL_CATEGORY_META[meal.category];
                  return (
                    <div key={meal.id} className="doodle-card p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <MealPhotoDisplay meal={meal} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${catMeta.badgeBg}`}
                            >
                              {catMeta.emoji} {catMeta.label}
                            </span>
                            <span className="text-base font-black text-[#BA7E4D]">
                              {meal.totalCalories} kcal
                            </span>
                          </div>
                          <h4 className="font-black text-sm text-[#422B1D] mt-1 truncate">
                            {meal.title}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {meal.items.map((it) => (
                              <span
                                key={it.id}
                                className="px-2 py-0.5 rounded-lg bg-[#FAF4EB] border border-[#EAD8C0] text-[10px] text-[#5C3F2D]"
                              >
                                {it.name} ({it.calories})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quokka Warm Praise Bubble */}
                      <div className="p-2.5 rounded-xl bg-[#FFF6E8] border border-[#ECD4B4] text-xs text-[#5C3F2D] leading-relaxed flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#F4B860] shrink-0 mt-0.5" />
                        <span>{meal.praise}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMeal(meal);
                              setShowMealModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#EFECE3] hover:bg-[#E4E0D4] border border-[#DDD7C9] text-xs font-bold text-[#25385B]"
                          >
                            <PencilLine className="w-3.5 h-3.5" /> 編輯／重算
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[#B07268] hover:text-[#7D362B]"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 刪除
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFocusMealForWorkout(meal);
                            setActiveNav('workout');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E3F1DF] border border-[#8FBC8B] text-xs font-black text-[#355E30]"
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          搭配這餐的消食運動
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Completed Workouts Today */}
            {dayWorkouts.length > 0 && (
              <div className="doodle-card p-4 space-y-2.5">
                <h3 className="font-black text-sm text-[#422B1D]">
                  🏅 今日已完成的超棒運動 ({dayWorkouts.length})
                </h3>
                <div className="space-y-2">
                  {dayWorkouts.map((wo) => (
                    <div
                      key={wo.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF4EB] border border-[#E5CFB3]"
                    >
                      <div>
                        <div className="text-xs font-black text-[#422B1D]">{wo.exerciseName}</div>
                        <div className="text-[11px] text-[#7C5841]">
                          計時 {Math.round(wo.durationSec / 60 * 10) / 10} 分鐘
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#8FBC8B]">
                          🔥 -{wo.caloriesBurned} kcal
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkout(wo.id)}
                          className="p-1 text-[#B07268]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeNav === 'workout' && (
          <WorkoutPlannerView
            todayMeals={dayMeals}
            weightKg={vault.profile.weightKg}
            initialFocusMeal={focusMealForWorkout}
            onStartPlaylist={(items, sourceMealId) =>
              setActivePlaylist({ items, sourceMealId })
            }
          />
        )}

        {activeNav === 'history' && (
          <div className="space-y-4">
            <div className="doodle-card overflow-hidden text-center">
              <div className="bg-[#F3C85F] pt-4 pb-2">
                <MascotDuoIllustration mood="proud" className="w-44 h-28 mx-auto" />
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-black text-lg text-[#2C241E]">
                  Marsh 棉花糖疊疊樂足跡（累計 {vault.stamps.length} 層）
                </h3>
                <p className="text-xs text-[#6E6459]">
                  每一次好好喝水、好好記錄三餐、跟著 Quokka ＆ BOBO 動一動，都在棉花糖村疊高一層幸福 🤍
                </p>
              </div>
            </div>

            <div className="doodle-card p-4 space-y-2.5">
              <h4 className="font-black text-sm text-[#422B1D]">📅 最近 7 天療癒足跡</h4>
              {recent7Days.map((row) => (
                <button
                  key={row.dk}
                  type="button"
                  onClick={() => {
                    setSelectedDate(row.dk);
                    setActiveNav('diary');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FAF4EB] hover:bg-[#F2E5D3] border border-[#E5CFB3] text-left transition"
                >
                  <div>
                    <div className="text-xs font-black text-[#422B1D] flex items-center gap-1.5">
                      <span>{row.dk === todayKey ? `今天 (${row.dk})` : row.dk}</span>
                      {row.hasStamp && <span>🍡</span>}
                    </div>
                    <div className="text-[11px] text-[#7C5841] mt-0.5">
                      🍽️ 攝取 {row.mKcal} kcal · 🔥 運動 {row.wKcal} kcal · 💧 喝水 {row.wtMl} ml
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9C7E63]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-t-2 border-[#E5CFB3] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto grid grid-cols-3 px-4 py-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveNav('diary')}
            className={`py-2 rounded-2xl flex flex-col items-center gap-0.5 text-xs font-black transition ${
              activeNav === 'diary'
                ? 'bg-[#F5E6D3] text-[#422B1D]'
                : 'text-[#8C6D53]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>今日日記</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('workout')}
            className={`py-2 rounded-2xl flex flex-col items-center gap-0.5 text-xs font-black transition ${
              activeNav === 'workout'
                ? 'bg-[#E3F1DF] text-[#355E30]'
                : 'text-[#8C6D53]'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>運動跟練館</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('history')}
            className={`py-2 rounded-2xl flex flex-col items-center gap-0.5 text-xs font-black transition ${
              activeNav === 'history'
                ? 'bg-[#FFF3DF] text-[#7A5116]'
                : 'text-[#8C6D53]'
            }`}
          >
            <CalendarHeart className="w-4 h-4" />
            <span>棉花糖足跡</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      {showMealModal && (
        <MealLoggerModal
          dateKey={selectedDate}
          geminiApiKey={vault.geminiApiKey}
          initialMeal={editingMeal}
          onSaveMeal={handleSaveMeal}
          onOpenSettingsForApiKey={() => {
            setEditingMeal(null);
            setShowMealModal(false);
            setShowSettingsModal(true);
          }}
          onClose={() => {
            setEditingMeal(null);
            setShowMealModal(false);
          }}
        />
      )}

      {activePlaylist && (
        <WorkoutPlayerModal
          playlist={activePlaylist.items}
          weightKg={vault.profile.weightKg}
          sourceMealId={activePlaylist.sourceMealId}
          onCompleteWorkout={handleCompleteWorkout}
          onClose={() => setActivePlaylist(null)}
        />
      )}

      {showSettingsModal && (
        <SettingsVaultModal
          profile={vault.profile}
          geminiApiKey={vault.geminiApiKey}
          activePasscode={passcode}
          syncBusy={syncBusy}
          onUnlockOrChangePasscode={handleBindPasscode}
          onSaveProfileAndKey={handleSaveProfileAndKey}
          onExportBackup={() => exportBackupJson(vault)}
          onImportBackup={handleImportBackup}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
