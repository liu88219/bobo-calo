import React, { useMemo, useState } from 'react';
import { X, Flame, Star, Sparkles, Check } from 'lucide-react';
import {
  EXTRA_SPORTS,
  ExtraSportCategory,
  SPORT_EFFORT_META,
  SportEffortLevel,
  calculateExtraSportCalories,
} from '../data/extraSports';
import { FavoriteSportPreset } from '../types/tracker';
import { soundEngine } from '../services/soundEffects';

interface Props {
  weightKg: number;
  initialCategory?: ExtraSportCategory | 'custom';
  existingFavorites: FavoriteSportPreset[];
  onLogExtraSport: (
    payload: {
      sportId: string;
      exerciseName: string;
      durationSec: number;
      caloriesBurned: number;
    },
    pinPreset?: Omit<FavoriteSportPreset, 'id' | 'createdAt'>
  ) => void;
  onClose: () => void;
}

export const ExtraSportLoggerModal: React.FC<Props> = ({
  weightKg,
  initialCategory = 'dance',
  existingFavorites,
  onLogExtraSport,
  onClose,
}) => {
  const [tab, setTab] = useState<ExtraSportCategory | 'custom'>(initialCategory);
  const [selectedSportId, setSelectedSportId] = useState<string>(() => {
    const first = EXTRA_SPORTS.find(
      (s) => s.category === (initialCategory === 'custom' ? 'dance' : initialCategory)
    );
    return first ? first.id : EXTRA_SPORTS[0].id;
  });

  const selectedSport = useMemo(
    () => EXTRA_SPORTS.find((s) => s.id === selectedSportId) || EXTRA_SPORTS[0],
    [selectedSportId]
  );

  const [minutesStr, setMinutesStr] = useState<string>(() =>
    String(selectedSport?.defaultMinutes || 60)
  );
  const [effort, setEffort] = useState<SportEffortLevel>('normal');
  const [pinAsFavorite, setPinAsFavorite] = useState<boolean>(true);

  // Custom / Smartwatch direct mode state
  const [customName, setCustomName] = useState<string>('Apple Watch 運動紀錄');
  const [customKcalStr, setCustomKcalStr] = useState<string>('250');

  const safeMinutes = Math.max(1, Number.parseInt(minutesStr, 10) || 30);

  const filteredSports = useMemo(() => {
    if (tab === 'custom') return [];
    return EXTRA_SPORTS.filter((s) => s.category === tab);
  }, [tab]);

  const calculatedKcal = useMemo(() => {
    if (tab === 'custom') {
      return Math.max(5, Number.parseInt(customKcalStr, 10) || 100);
    }
    return calculateExtraSportCalories({
      met: selectedSport.met,
      weightKg,
      minutes: safeMinutes,
      effort,
    });
  }, [tab, customKcalStr, selectedSport.met, weightKg, safeMinutes, effort]);

  const alreadyPinned = useMemo(() => {
    if (tab === 'custom') {
      return existingFavorites.some(
        (f) =>
          f.name === (customName.trim() || '自訂運動') &&
          f.minutes === safeMinutes &&
          f.customCalories === calculatedKcal
      );
    }
    return existingFavorites.some(
      (f) =>
        f.sportId === selectedSport.id &&
        f.minutes === safeMinutes &&
        f.effort === effort
    );
  }, [tab, existingFavorites, customName, safeMinutes, calculatedKcal, selectedSport.id, effort]);

  const handleSwitchTab = (nextTab: ExtraSportCategory | 'custom') => {
    setTab(nextTab);
    if (nextTab !== 'custom') {
      const first = EXTRA_SPORTS.find((s) => s.category === nextTab);
      if (first) {
        setSelectedSportId(first.id);
        setMinutesStr(String(first.defaultMinutes));
      }
    }
  };

  const handleSelectSport = (sportId: string, defaultMins: number) => {
    setSelectedSportId(sportId);
    setMinutesStr(String(defaultMins));
  };

  const handleSubmit = () => {
    soundEngine.unlock();
    soundEngine.playVictoryFanfare();

    if (tab === 'custom') {
      const cleanTitle = customName.trim() || '自訂額外運動';
      const presetToPin =
        pinAsFavorite && !alreadyPinned
          ? {
              sportId: 'custom_watch_sport',
              name: cleanTitle,
              emoji: '⌚',
              minutes: safeMinutes,
              effort: 'normal' as const,
              met: 5.0,
              customCalories: calculatedKcal,
            }
          : undefined;

      onLogExtraSport(
        {
          sportId: 'custom_watch_sport',
          exerciseName: `⌚ ${cleanTitle}`,
          durationSec: safeMinutes * 60,
          caloriesBurned: calculatedKcal,
        },
        presetToPin
      );
      return;
    }

    const effortBadge =
      effort === 'light' ? '（輕鬆）' : effort === 'intense' ? '（高強度）' : '';
    const displayTitle = `${selectedSport.emoji} ${selectedSport.name}${effortBadge}`;

    const presetToPin =
      pinAsFavorite && !alreadyPinned
        ? {
            sportId: selectedSport.id,
            name: selectedSport.name,
            emoji: selectedSport.emoji,
            minutes: safeMinutes,
            effort,
            met: selectedSport.met,
          }
        : undefined;

    onLogExtraSport(
      {
        sportId: selectedSport.id,
        exerciseName: displayTitle,
        durationSec: safeMinutes * 60,
        caloriesBurned: calculatedKcal,
      },
      presetToPin
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#FAF8F3] border-2 border-[#DDD7C9] shadow-2xl p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-black text-base text-[#2C241E] flex items-center gap-1.5">
              <span>💃🏸</span>
              <span>額外運動（跳舞／打球／健身）熱量計算機</span>
            </h3>
            <p className="text-[11px] text-[#6E6459] mt-0.5">
              依妳目前體重 <b className="text-[#2C241E]">{weightKg} kg</b> × 國際運動醫學 MET 代謝當量精準換算，還可釘選成固定常用運動一鍵打卡！
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#EFECE3] text-[#5C5044] hover:bg-[#E2DDD0]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Category Tabs */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-[#EFECE3] p-1">
          {[
            { id: 'dance' as const, label: '💃 跳舞課' },
            { id: 'ball' as const, label: '🏸 打球類' },
            { id: 'fitness' as const, label: '🧘‍♀️ 健身有氧' },
            { id: 'custom' as const, label: '⌚ 手錶自訂' },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSwitchTab(t.id)}
                className={`py-2 px-1 rounded-xl text-[11px] font-black transition ${
                  active
                    ? 'bg-[#F3C85F] text-[#2C241E] shadow-xs border border-[#2C241E]/25'
                    : 'text-[#5C5044]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab !== 'custom' ? (
          <>
            {/* Sport Selection Grid */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
              {filteredSports.map((sport) => {
                const isSelected = sport.id === selectedSport.id;
                const previewKcal = calculateExtraSportCalories({
                  met: sport.met,
                  weightKg,
                  minutes: isSelected ? safeMinutes : sport.defaultMinutes,
                  effort,
                });
                const previewMins = isSelected ? safeMinutes : sport.defaultMinutes;

                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSelectSport(sport.id, sport.defaultMinutes)}
                    className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'bg-[#FFF6E2] border-[#C48E63] shadow-xs'
                        : 'bg-white border-[#E5DFD2] hover:bg-[#FAF4EB]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-xl shrink-0 mt-0.5">{sport.emoji}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#2C241E] flex items-center gap-1.5 flex-wrap">
                          <span>{sport.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#EFECE3] text-[10px] font-bold text-[#6E6459]">
                            MET {sport.met}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#7A6F63] mt-0.5">{sport.hint}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-[#C83B32]">🔥 {previewKcal} kcal</div>
                      <div className="text-[10px] text-[#8A7E70]">{previewMins} 分鐘</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Duration & Effort Controls */}
            <div className="rounded-2xl bg-[#EFECE3] p-3.5 space-y-3">
              {/* Duration Row */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-black text-[#2C241E]">
                    ⏱️ 這次運動／上課多久？
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="60"
                      value={minutesStr}
                      onChange={(e) => setMinutesStr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-16 px-2 py-1 rounded-xl border border-[#D8D2C5] bg-white text-sm font-black text-center text-[#2C241E] focus:outline-none focus:border-[#2C241E]"
                    />
                    <span className="text-xs font-bold text-[#5C5044]">分鐘</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[30, 45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutesStr(String(m))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                        safeMinutes === m
                          ? 'bg-[#25385B] border-[#25385B] text-white'
                          : 'bg-[#FAF8F3] border-[#DDD7C9] text-[#5C5044]'
                      }`}
                    >
                      {m} 分鐘
                    </button>
                  ))}
                </div>
              </div>

              {/* Effort Level Row */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#2C241E] block">
                  💦 體感流汗強度（自動校正休息與跑動比例）：
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['light', 'normal', 'intense'] as SportEffortLevel[]).map((lv) => {
                    const meta = SPORT_EFFORT_META[lv];
                    const active = effort === lv;
                    return (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setEffort(lv)}
                        className={`p-2 rounded-xl border text-left transition ${
                          active
                            ? 'bg-[#F3C85F] border-[#2C241E] text-[#2C241E]'
                            : 'bg-[#FAF8F3] border-[#DDD7C9] text-[#5C5044]'
                        }`}
                      >
                        <div className="text-[11px] font-black leading-tight">{meta.label}</div>
                        <div className="text-[9px] opacity-80 mt-0.5 leading-snug">{meta.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Smartwatch / Custom Direct Input Mode */
          <div className="rounded-2xl bg-[#EFECE3] p-3.5 space-y-3">
            <p className="text-[11px] text-[#5C5044] leading-relaxed">
              ⌚ 若妳跳舞或打球時有戴 <b>Apple Watch / Garmin 運動手錶</b>，可以直接輸入手錶上的「動態卡路里（Active kcal）」，最精準無誤差！
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-black text-[#2C241E] block mb-1">
                  運動項目名稱
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="例如：週三 K-pop 雕舞課、週五羽球社"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs font-bold text-[#2C241E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-black text-[#2C241E] block mb-1">
                    運動時間（分鐘）
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="60"
                    value={minutesStr}
                    onChange={(e) => setMinutesStr(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-sm font-black text-[#2C241E]"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-[#2C241E] block mb-1">
                    消耗熱量（kcal）
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="250"
                    value={customKcalStr}
                    onChange={(e) => setCustomKcalStr(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-sm font-black text-[#C83B32]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transparent Calorie Preview Banner */}
        <div className="rounded-2xl bg-[#FFF6E2] border border-[#E5C98B] p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-[#2C241E] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C83B32]" />
              <span>本次預計消化熱量</span>
            </div>
            <div className="text-[10px] text-[#6E6459]">
              {tab === 'custom'
                ? `依自訂／手錶紀錄 · 共 ${safeMinutes} 分鐘`
                : `公式：MET ${selectedSport.met} × 強度 ${SPORT_EFFORT_META[effort].factor} × ${weightKg}kg × ${(
                    safeMinutes / 60
                  ).toFixed(2)}hr`}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-black text-[#C83B32]">🔥 {calculatedKcal} kcal</div>
          </div>
        </div>

        {/* Pin as Fixed Regular Sport Checkbox */}
        {!alreadyPinned ? (
          <button
            type="button"
            onClick={() => setPinAsFavorite((v) => !v)}
            className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition ${
              pinAsFavorite
                ? 'bg-[#E3F1DF]/75 border-[#8FBC8B] text-[#2F522B]'
                : 'bg-white border-[#DDD7C9] text-[#5C5044]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                pinAsFavorite ? 'bg-[#485F44] text-white' : 'border border-[#B8B0A2] bg-[#FAF8F3]'
              }`}
            >
              {pinAsFavorite && <Check className="w-3.5 h-3.5" />}
            </div>
            <div className="text-xs font-bold leading-snug">
              <Star className="w-3.5 h-3.5 inline text-[#E09F3E] mr-1 -mt-0.5 fill-current" />
              釘選為我的「固定常用運動」捷徑（之後跳完舞／打完球點一下 1 秒打卡！）
            </div>
          </button>
        ) : (
          <div className="text-[11px] font-bold text-[#485F44] px-1">
            ⭐ 這組運動時間已在妳的「固定常用運動」快捷鍵裡囉！
          </div>
        )}

        {/* Submit CTA */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl bg-[#C83B32] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2"
        >
          <Flame className="w-4 h-4 fill-current" />
          記下這筆運動（消耗 🔥 {calculatedKcal} kcal）並疊棉花糖！
        </button>
      </div>
    </div>
  );
};
