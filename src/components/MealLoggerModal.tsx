import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Search,
  Plus,
  Trash2,
  X,
  Settings,
  Dumbbell,
  Check,
  Loader2,
} from 'lucide-react';
import {
  MealCategory,
  MealFoodItem,
  MealLog,
  MEAL_CATEGORY_META,
  getLocalDateKey,
} from '../types/tracker';
import { TAIWAN_FOOD_PRESETS, TaiwanFoodPreset } from '../data/taiwanFoods';
import { pickMealPraise } from '../data/praiseMessages';
import {
  analyzeMealWithGemini,
  processMealPhotoFile,
  ProcessedMealImages,
} from '../services/geminiService';
import { saveLocalHiResPhoto } from '../services/cloudSync';

interface Props {
  dateKey?: string;
  geminiApiKey: string;
  onSaveMeal: (meal: MealLog, launchExerciseAfter: boolean) => void;
  onOpenSettingsForApiKey: () => void;
  onClose: () => void;
}

const QUICK_NOTE_CHIPS = [
  '白飯吃一半',
  '去皮少油',
  '無糖',
  '微糖去冰',
  '醬汁減半',
  '不喝湯',
];

function inferDefaultCategory(): MealCategory {
  const h = new Date().getHours();
  if (h >= 5 && h < 10.5) return 'breakfast';
  if (h >= 10.5 && h < 14.5) return 'lunch';
  if (h >= 17 && h < 21.5) return 'dinner';
  return 'snack';
}

export const MealLoggerModal: React.FC<Props> = ({
  dateKey,
  geminiApiKey,
  onSaveMeal,
  onOpenSettingsForApiKey,
  onClose,
}) => {
  const [category, setCategory] = useState<MealCategory>(inferDefaultCategory);
  const [tab, setTab] = useState<'ai' | 'preset'>('ai');
  const [processedImg, setProcessedImg] = useState<ProcessedMealImages | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Editable draft result
  const [mealTitle, setMealTitle] = useState('');
  const [items, setItems] = useState<MealFoodItem[]>([]);
  const [praise, setPraise] = useState('');

  // Offline preset search & custom entry
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('全部');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      const processed = await processMealPhotoFile(file);
      setProcessedImg(processed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '照片處理失敗');
    }
    e.target.value = '';
  };

  const appendNoteChip = (chip: string) => {
    setDescriptionText((prev) => (prev.includes(chip) ? prev : prev ? `${prev}、${chip}` : chip));
  };

  const handleRunAiAnalysis = async () => {
    setErrorMsg('');
    if (!processedImg && !descriptionText.trim()) {
      setErrorMsg('請先拍一張美食照片，或輸入吃了什麼喔 🍱');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await analyzeMealWithGemini({
        apiKey: geminiApiKey,
        category,
        descriptionText,
        imageBase64: processedImg?.apiBase64,
        imageMimeType: processedImg?.mimeType,
      });
      setMealTitle(res.title);
      setItems(res.items);
      setPraise(res.praise);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI 分析失敗，請稍後再試或改用速查庫');
    } finally {
      setAnalyzing(false);
    }
  };

  const addPresetFood = (preset: TaiwanFoodPreset, scale = 1) => {
    const newItem: MealFoodItem = {
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: scale === 1 ? preset.name : `${preset.name} (${scale}份)`,
      portion: scale === 1 ? preset.portion : `${scale} × ${preset.portion}`,
      calories: Math.round(preset.calories * scale),
      proteinG: Math.round(preset.proteinG * scale * 10) / 10,
      carbsG: Math.round(preset.carbsG * scale * 10) / 10,
      fatG: Math.round(preset.fatG * scale * 10) / 10,
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      if (!mealTitle.trim()) {
        setMealTitle(next.map((x) => x.name).join('＋'));
      }
      return next;
    });
  };

  const handleAddCustomItem = () => {
    const kcal = Math.round(Number(customCalories));
    if (!customName.trim() || !kcal || kcal <= 0) return;
    const newItem: MealFoodItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      portion: '1份',
      calories: kcal,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    };
    setItems((prev) => [...prev, newItem]);
    if (!mealTitle.trim()) setMealTitle(customName.trim());
    setCustomName('');
    setCustomCalories('');
  };

  const updateItemCalories = (id: string, nextKcal: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, calories: Math.max(0, Math.round(nextKcal)) } : it))
    );
  };

  const scaleItem = (id: string, factor: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              calories: Math.max(1, Math.round(it.calories * factor)),
              proteinG: Math.round(it.proteinG * factor * 10) / 10,
              carbsG: Math.round(it.carbsG * factor * 10) / 10,
              fatG: Math.round(it.fatG * factor * 10) / 10,
            }
          : it
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const totals = useMemo(() => {
    const totalCalories = items.reduce((s, i) => s + i.calories, 0);
    const proteinG = Math.round(items.reduce((s, i) => s + i.proteinG, 0) * 10) / 10;
    const carbsG = Math.round(items.reduce((s, i) => s + i.carbsG, 0) * 10) / 10;
    const fatG = Math.round(items.reduce((s, i) => s + i.fatG, 0) * 10) / 10;
    return { totalCalories, proteinG, carbsG, fatG };
  }, [items]);

  const filteredPresets = useMemo(() => {
    return TAIWAN_FOOD_PRESETS.filter((p) => {
      const matchGroup = selectedGroup === '全部' || p.group === selectedGroup;
      const matchQ = !searchQuery.trim() || p.name.includes(searchQuery.trim());
      return matchGroup && matchQ;
    });
  }, [selectedGroup, searchQuery]);

  const handleFinalize = async (launchExerciseAfter: boolean) => {
    if (items.length === 0) {
      setErrorMsg('請先用 AI 估算或從下方點選至少一樣食物喔 🤎');
      return;
    }
    const now = Date.now();
    const id = `meal-${now}-${Math.random().toString(36).slice(2, 6)}`;
    if (processedImg?.localPreviewUrl) {
      await saveLocalHiResPhoto(id, processedImg.localPreviewUrl);
    }
    const finalTitle = mealTitle.trim() || items.map((i) => i.name).join('＋');
    const finalPraise = praise.trim() || pickMealPraise(category, totals.totalCalories);

    const log: MealLog = {
      id,
      dateKey: dateKey || getLocalDateKey(),
      category,
      title: finalTitle,
      items,
      totalCalories: totals.totalCalories,
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
      photoThumb: processedImg?.cloudThumbUrl,
      hasLocalHiResPhoto: Boolean(processedImg?.localPreviewUrl),
      note: descriptionText.trim() || undefined,
      praise: finalPraise,
      createdAt: now,
      updatedAt: now,
    };
    onSaveMeal(log, launchExerciseAfter);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#422B1D]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#FFFDF9] sm:rounded-3xl rounded-t-3xl border-t-2 sm:border-2 border-[#DFC8AC] p-5 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#422B1D]">📸 記錄美味的一餐</h3>
            <p className="text-xs text-[#7C5841]">拍照或描述交給矮袋鼠估算，吃得開心最重要 🤎</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#FAF4EB] border border-[#DFC8AC] text-[#5C3F2D]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meal Category Pills */}
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(MEAL_CATEGORY_META) as MealCategory[]).map((cat) => {
            const meta = MEAL_CATEGORY_META[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2 px-1 rounded-2xl text-xs font-bold border-2 transition ${
                  active
                    ? 'bg-[#F5E6D3] border-[#422B1D] text-[#422B1D] shadow-sm'
                    : 'bg-white border-[#EAD8C0] text-[#7C5841]'
                }`}
              >
                <span className="mr-1">{meta.emoji}</span>
                {meta.label.slice(0, 2)}
              </button>
            );
          })}
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex rounded-2xl bg-[#FAF4EB] p-1 border border-[#E5CFB3]">
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === 'ai' ? 'bg-white text-[#422B1D] shadow-sm' : 'text-[#7C5841]'
            }`}
          >
            📸 拍照／描述 AI 估算
          </button>
          <button
            type="button"
            onClick={() => setTab('preset')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === 'preset' ? 'bg-white text-[#422B1D] shadow-sm' : 'text-[#7C5841]'
            }`}
          >
            🍱 台灣美食速查／自訂
          </button>
        </div>

        {tab === 'ai' ? (
          <div className="space-y-3">
            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {processedImg ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#DFC8AC] bg-[#FAF4EB]">
                <img
                  src={processedImg.localPreviewUrl}
                  alt="餐點預覽"
                  className="w-full max-h-52 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setProcessedImg(null)}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-[#422B1D]/80 text-white text-xs font-bold"
                >
                  重拍／更換
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-5 px-3 rounded-2xl bg-[#FFF6E8] hover:bg-[#FDECC8] border-2 border-dashed border-[#BA7E4D] flex flex-col items-center justify-center gap-1.5 text-[#5C3F2D] transition"
                >
                  <Camera className="w-7 h-7 text-[#BA7E4D]" />
                  <span className="text-sm font-black">拍下這餐美食</span>
                  <span className="text-[11px] text-[#7C5841]">開啟手機相機即拍即算</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-5 px-3 rounded-2xl bg-[#FAF4EB] hover:bg-[#F2E5D3] border-2 border-dashed border-[#C9B093] flex flex-col items-center justify-center gap-1.5 text-[#5C3F2D] transition"
                >
                  <ImageIcon className="w-7 h-7 text-[#8FBC8B]" />
                  <span className="text-sm font-black">從相簿選照片</span>
                  <span className="text-[11px] text-[#7C5841]">上傳剛剛拍好的食物照</span>
                </button>
              </div>
            )}

            {/* Text description + quick chips */}
            <div className="space-y-2">
              <textarea
                rows={2}
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="可補充文字或直接描述（例如：雞腿便當飯吃一半＋無糖綠茶）"
                className="w-full rounded-2xl border-2 border-[#E5CFB3] bg-white px-3.5 py-2.5 text-sm text-[#422B1D] placeholder:text-[#B0977D] focus:outline-none focus:border-[#BA7E4D]"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendNoteChip(chip)}
                    className="px-2.5 py-1 rounded-full bg-[#FAF4EB] hover:bg-[#F2E5D3] border border-[#DFC8AC] text-[11px] font-bold text-[#5C3F2D]"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={analyzing}
              onClick={handleRunAiAnalysis}
              className="w-full py-3.5 rounded-2xl bg-[#C83B32] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Quokka & BOBO 正在看照片聞香估算中（約 3~8 秒）...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  請 Quokka ＆ BOBO AI 幫我算卡路里！
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-[#6E6459]">
              ✨ 已幫妳內建免設定雲端視覺與營養 AI，不用填 API Key 就能直接拍照或打字估算喔！
            </p>
          </div>
        ) : (
          /* Offline Taiwan Preset Picker */
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#9C7E63] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋蛋餅、雞腿便當、珍奶、地瓜..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#DFC8AC] bg-white text-sm focus:outline-none focus:border-[#BA7E4D]"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {['全部', '早餐店', '便當小吃', '超商輕食', '手搖咖啡', '鍋物聚餐', '水果點心'].map(
                (grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setSelectedGroup(grp)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${
                      selectedGroup === grp
                        ? 'bg-[#BA7E4D] text-white border-[#422B1D]'
                        : 'bg-[#FAF4EB] text-[#5C3F2D] border-[#DFC8AC]'
                    }`}
                  >
                    {grp}
                  </button>
                )
              )}
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {filteredPresets.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF4EB] border border-[#E5CFB3]"
                >
                  <div>
                    <div className="text-xs font-bold text-[#422B1D]">{food.name}</div>
                    <div className="text-[11px] text-[#7C5841]">
                      {food.portion} · <span className="font-bold text-[#BA7E4D]">{food.calories} kcal</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => addPresetFood(food, 0.5)}
                      className="px-2 py-1 rounded-lg bg-white border border-[#DFC8AC] text-[11px] font-bold text-[#5C3F2D]"
                    >
                      +半份
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetFood(food, 1)}
                      className="px-2.5 py-1 rounded-lg bg-[#8FBC8B] text-white text-[11px] font-bold"
                    >
                      +1份
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom quick item */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="自訂食物名稱"
                className="flex-1 px-3 py-2 rounded-xl border border-[#DFC8AC] text-xs bg-white"
              />
              <input
                type="number"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value)}
                placeholder="大卡"
                className="w-20 px-2.5 py-2 rounded-xl border border-[#DFC8AC] text-xs bg-white"
              />
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-3 py-2 rounded-xl bg-[#F4B860] text-[#422B1D] font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 加入
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-[#FCE1DC] border border-[#E8A598] text-xs font-bold text-[#7D362B]">
            {errorMsg}
          </div>
        )}

        {/* Parsed / Selected Items Breakdown */}
        {items.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#EAD8C0]">
            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">餐點名稱</label>
              <input
                type="text"
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DFC8AC] bg-white text-sm font-bold text-[#422B1D]"
              />
            </div>

            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FAF4EB] border border-[#E5CFB3]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#422B1D] truncate">{it.name}</div>
                    <div className="text-[11px] text-[#7C5841]">
                      {it.portion} · 蛋白質 {it.proteinG}g / 碳水 {it.carbsG}g / 脂肪 {it.fatG}g
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => scaleItem(it.id, 0.5)}
                      className="px-1.5 py-0.5 rounded bg-white border border-[#DFC8AC] text-[10px] font-bold text-[#7C5841]"
                      title="份量減半"
                    >
                      ×0.5
                    </button>
                    <input
                      type="number"
                      value={it.calories}
                      onChange={(e) => updateItemCalories(it.id, Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded-lg border border-[#DFC8AC] bg-white text-xs font-black text-right text-[#BA7E4D]"
                    />
                    <span className="text-[11px] text-[#7C5841]">kcal</span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="p-1 text-[#B07268] hover:text-[#7D362B]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary + Praise Preview */}
            <div className="p-3.5 rounded-2xl bg-[#FFF6E8] border border-[#ECD4B4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5C3F2D]">本餐總估算熱量</span>
                <span className="text-xl font-black text-[#BA7E4D]">{totals.totalCalories} kcal</span>
              </div>
              <div className="text-[11px] text-[#7C5841] flex gap-3">
                <span>🥩 蛋白質 {totals.proteinG}g</span>
                <span>🍚 碳水 {totals.carbsG}g</span>
                <span>🥑 脂肪 {totals.fatG}g</span>
              </div>
              {praise && (
                <p className="text-xs text-[#5C3F2D] pt-1 border-t border-[#EAD8C0] leading-relaxed">
                  🦘 {praise}
                </p>
              )}
            </div>

            {/* Save Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleFinalize(false)}
                className="py-3 px-4 rounded-2xl bg-[#FAF4EB] text-[#422B1D] font-bold text-sm doodle-btn flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                儲存這餐紀錄
              </button>
              <button
                type="button"
                onClick={() => handleFinalize(true)}
                className="py-3 px-4 rounded-2xl bg-[#8FBC8B] text-white font-bold text-sm doodle-btn flex items-center justify-center gap-1.5"
              >
                <Dumbbell className="w-4 h-4" />
                儲存並搭配消食運動！
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
