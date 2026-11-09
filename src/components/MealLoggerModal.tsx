import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Search,
  Plus,
  Trash2,
  X,
  Dumbbell,
  Check,
  Loader2,
  RefreshCw,
  PencilLine,
} from 'lucide-react';
import {
  MealCategory,
  MealFoodItem,
  MealLog,
  MEAL_CATEGORY_META,
  getLocalDateKey,
} from '../types/tracker';
import {
  TAIWAN_FOOD_PRESETS,
  TaiwanFoodPreset,
  BuffetSubType,
} from '../data/taiwanFoods';
import { pickMealPraise } from '../data/praiseMessages';
import {
  analyzeMealWithGemini,
  recalculateMealFromEdits,
  processMealPhotoFile,
  ProcessedMealImages,
} from '../services/geminiService';
import { getLocalHiResPhoto, saveLocalHiResPhoto } from '../services/cloudSync';

interface Props {
  dateKey?: string;
  geminiApiKey: string;
  initialMeal?: MealLog | null;
  onSaveMeal: (meal: MealLog, launchExerciseAfter: boolean) => void;
  onOpenSettingsForApiKey?: () => void;
  onClose: () => void;
}

const QUICK_NOTE_CHIPS = [
  '自助餐分格盤',
  '白飯吃一半',
  '紫米/五穀飯半碗',
  '沒夾飯(無澱粉)',
  '配菜瀝油',
  '去皮少油',
  '無糖',
  '微糖去冰',
  '醬汁減半',
  '不喝湯',
  '包裝營養標示(吃1份)',
  '包裝營養標示(整包/整瓶)',
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
  initialMeal,
  onSaveMeal,
  onClose,
}) => {
  const isEditingExisting = Boolean(initialMeal);

  const [category, setCategory] = useState<MealCategory>(
    () => initialMeal?.category || inferDefaultCategory()
  );
  const [tab, setTab] = useState<'ai' | 'preset'>('ai');
  const [processedImg, setProcessedImg] = useState<ProcessedMealImages | null>(null);
  const [existingPhotoPreview, setExistingPhotoPreview] = useState<string | null>(
    () => initialMeal?.photoThumb || null
  );
  const [descriptionText, setDescriptionText] = useState(() => initialMeal?.note || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recalcSuccessMsg, setRecalcSuccessMsg] = useState('');

  // Editable draft result
  const [hasAnalyzed, setHasAnalyzed] = useState(() => Boolean(initialMeal));
  const [mealTitle, setMealTitle] = useState(() => initialMeal?.title || '');
  const [items, setItems] = useState<MealFoodItem[]>(() =>
    initialMeal ? initialMeal.items.map((it) => ({ ...it })) : []
  );
  const [praise, setPraise] = useState(() => initialMeal?.praise || '');
  const [correctionNote, setCorrectionNote] = useState('');
  const [needsRecalc, setNeedsRecalc] = useState(false);

  // Offline preset search & custom entry
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('自助餐夾菜');
  const [buffetSubFilter, setBuffetSubFilter] = useState<'all' | BuffetSubType>('all');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    if (initialMeal?.hasLocalHiResPhoto) {
      getLocalHiResPhoto(initialMeal.id).then((res) => {
        if (active && res) setExistingPhotoPreview(res);
      });
    }
    return () => {
      active = false;
    };
  }, [initialMeal]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setRecalcSuccessMsg('');
    try {
      const processed = await processMealPhotoFile(file);
      setProcessedImg(processed);
      setExistingPhotoPreview(null);
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
    setRecalcSuccessMsg('');
    const existingBase64 =
      existingPhotoPreview && existingPhotoPreview.startsWith('data:image/')
        ? existingPhotoPreview.slice(existingPhotoPreview.indexOf(',') + 1)
        : undefined;
    const effectiveBase64 = processedImg?.apiBase64 || existingBase64;
    if (!effectiveBase64 && !descriptionText.trim()) {
      setErrorMsg('請先拍一張美食照片，或輸入吃了什麼喔 🍱');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await analyzeMealWithGemini({
        apiKey: geminiApiKey,
        category,
        descriptionText,
        imageBase64: effectiveBase64,
        imageMimeType: processedImg?.mimeType || 'image/jpeg',
      });
      setMealTitle(res.title);
      setItems(res.items);
      setPraise(res.praise);
      setHasAnalyzed(true);
      setNeedsRecalc(false);
      setCorrectionNote('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI 分析失敗，請稍後再試或改用速查庫');
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * 當拍照辨識有誤時，使用者直接修改菜名／份量／新增漏掉項目／填寫修正提示後，一鍵請 AI 重新精算卡路里！
   */
  const handleRecalculateFromEdits = async () => {
    setErrorMsg('');
    setRecalcSuccessMsg('');
    const nonEmpty = items.filter((i) => i.name.trim().length > 0);
    if (nonEmpty.length === 0 && !correctionNote.trim()) {
      setErrorMsg('請先填寫正確的食物名稱，或在修正欄輸入內容喔 🤎');
      return;
    }

    setRecalculating(true);
    try {
      const res = await recalculateMealFromEdits({
        apiKey: geminiApiKey,
        category,
        editedItems: nonEmpty.map((i) => ({ name: i.name, portion: i.portion })),
        correctionNote,
      });
      setMealTitle(res.title);
      setItems(res.items);
      setPraise(res.praise);
      setHasAnalyzed(true);
      setNeedsRecalc(false);
      setCorrectionNote('');
      setRecalcSuccessMsg('✅ 已依照妳修正後的菜色與份量，重新算好卡路里與營養素囉！');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '重新計算失敗，請再點一次試試喔');
    } finally {
      setRecalculating(false);
    }
  };

  const addBlankEditableItem = () => {
    const newItem: MealFoodItem = {
      id: `manual-edit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: '',
      portion: '1份',
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setNeedsRecalc(true);
    setRecalcSuccessMsg('');
  };

  const updateItemField = (id: string, field: 'name' | 'portion', value: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
    setNeedsRecalc(true);
    setRecalcSuccessMsg('');
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
              portion: factor === 0.5 ? `半份 (${it.portion})` : it.portion,
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
    setNeedsRecalc(true);
    setRecalcSuccessMsg('');
  };

  const totals = useMemo(() => {
    const totalCalories = items.reduce((s, i) => s + i.calories, 0);
    const proteinG = Math.round(items.reduce((s, i) => s + i.proteinG, 0) * 10) / 10;
    const carbsG = Math.round(items.reduce((s, i) => s + i.carbsG, 0) * 10) / 10;
    const fatG = Math.round(items.reduce((s, i) => s + i.fatG, 0) * 10) / 10;
    return { totalCalories, proteinG, carbsG, fatG };
  }, [items]);

  const filteredPresets = useMemo(() => {
    const tokens = searchQuery
      .trim()
      .toLowerCase()
      .split(/[\s、，,+＋]+/)
      .filter(Boolean);

    return TAIWAN_FOOD_PRESETS.filter((p) => {
      // 當使用者輸入搜尋關鍵字時，貼心跨全部分類即時搜尋；未輸入時則依目前點選分類與自助餐子分類顯示
      const matchGroup =
        tokens.length > 0 ? true : selectedGroup === '全部' || p.group === selectedGroup;
      const matchSub =
        tokens.length > 0 ||
        selectedGroup !== '自助餐夾菜' ||
        buffetSubFilter === 'all' ||
        p.buffetSub === buffetSubFilter;
      const hay = `${p.name} ${p.portion} ${p.group}`.toLowerCase();
      const matchQ = tokens.length === 0 || tokens.every((tk) => hay.includes(tk));
      return matchGroup && matchSub && matchQ;
    });
  }, [selectedGroup, buffetSubFilter, searchQuery]);

  const handleFinalize = async (launchExerciseAfter: boolean) => {
    let validItems = items.filter((i) => i.name.trim().length > 0);
    if (validItems.length === 0 && !correctionNote.trim()) {
      setErrorMsg('請先用 AI 估算或輸入至少一樣食物喔 🤎');
      return;
    }

    let resolvedTitle = mealTitle.trim();
    let resolvedPraise = praise.trim();

    // 若使用者新增了漏掉的食物（熱量尚為 0）或填了修正說明但忘記先按「重新計算」，儲存時貼心自動幫她重算！
    if (validItems.some((i) => i.calories <= 0) || (validItems.length === 0 && correctionNote.trim())) {
      setRecalculating(true);
      setErrorMsg('');
      try {
        const res = await recalculateMealFromEdits({
          apiKey: geminiApiKey,
          category,
          editedItems: validItems.map((i) => ({ name: i.name, portion: i.portion })),
          correctionNote,
        });
        validItems = res.items;
        resolvedTitle = resolvedTitle || res.title;
        resolvedPraise = res.praise;
      } catch (err) {
        setRecalculating(false);
        setErrorMsg(err instanceof Error ? err.message : '重新計算失敗，請點「重新計算卡路里」再試一次喔');
        return;
      }
      setRecalculating(false);
    }

    const now = Date.now();
    const id = initialMeal?.id || `meal-${now}-${Math.random().toString(36).slice(2, 6)}`;
    if (processedImg?.localPreviewUrl) {
      await saveLocalHiResPhoto(id, processedImg.localPreviewUrl);
    }
    const finalTotalCalories = validItems.reduce((s, i) => s + i.calories, 0);
    const finalTitle = resolvedTitle || validItems.map((i) => i.name).join('＋');
    const finalPraise = resolvedPraise || pickMealPraise(category, finalTotalCalories);

    const log: MealLog = {
      id,
      dateKey: initialMeal?.dateKey || dateKey || getLocalDateKey(),
      category,
      title: finalTitle,
      items: validItems,
      totalCalories: finalTotalCalories,
      proteinG: Math.round(validItems.reduce((s, i) => s + i.proteinG, 0) * 10) / 10,
      carbsG: Math.round(validItems.reduce((s, i) => s + i.carbsG, 0) * 10) / 10,
      fatG: Math.round(validItems.reduce((s, i) => s + i.fatG, 0) * 10) / 10,
      photoThumb: processedImg?.cloudThumbUrl ?? initialMeal?.photoThumb,
      hasLocalHiResPhoto:
        Boolean(processedImg?.localPreviewUrl) || Boolean(initialMeal?.hasLocalHiResPhoto),
      note: descriptionText.trim() || undefined,
      praise: finalPraise,
      createdAt: initialMeal?.createdAt || now,
      updatedAt: now,
    };
    onSaveMeal(log, launchExerciseAfter);
  };

  const activePhotoUrl = processedImg?.localPreviewUrl || existingPhotoPreview;

  return (
    <div className="fixed inset-0 z-50 bg-[#2C241E]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#FAF8F3] sm:rounded-3xl rounded-t-3xl border-t-2 sm:border-2 border-[#DDD7C9] p-5 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#2C241E]">
              {isEditingExisting ? '✏️ 編輯餐點與重新計算卡路里' : '📸 記錄美味的一餐'}
            </h3>
            <p className="text-xs text-[#6E6459]">
              若 AI 看錯菜色或份量，直接修改文字再點「重新計算卡路里」即可精準重算 🤎
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#EFECE3] text-[#3D342C]"
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
                className={`py-2 px-1 rounded-2xl text-xs font-bold border transition ${
                  active
                    ? 'bg-[#F3C85F] border-[#2C241E] text-[#2C241E] shadow-sm'
                    : 'bg-white border-[#DDD7C9] text-[#6E6459]'
                }`}
              >
                <span className="mr-1">{meta.emoji}</span>
                {meta.label.slice(0, 2)}
              </button>
            );
          })}
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex rounded-2xl bg-[#EFECE3] p-1">
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === 'ai' ? 'bg-white text-[#2C241E] shadow-sm' : 'text-[#6E6459]'
            }`}
          >
            📸 拍照／描述 AI 估算
          </button>
          <button
            type="button"
            onClick={() => setTab('preset')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === 'preset' ? 'bg-white text-[#2C241E] shadow-sm' : 'text-[#6E6459]'
            }`}
          >
            🍱 台灣美食速查／自訂
          </button>
        </div>

        {tab === 'ai' ? (
          <div className="space-y-3">
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

            {activePhotoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#DDD7C9] bg-[#EFECE3]">
                <img
                  src={activePhotoUrl}
                  alt="餐點預覽"
                  className="w-full max-h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="absolute top-2 right-2 px-3 py-1 rounded-full bg-[#2C241E]/80 text-white text-xs font-bold"
                >
                  更換照片
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-5 px-3 rounded-2xl bg-[#F3C85F]/35 hover:bg-[#F3C85F]/55 border-2 border-dashed border-[#C48B60] flex flex-col items-center justify-center gap-1.5 text-[#2C241E] transition"
                >
                  <Camera className="w-7 h-7 text-[#C83B32]" />
                  <span className="text-sm font-black">拍下這餐美食</span>
                  <span className="text-[11px] text-[#6E6459]">拍食物或「背面營養標示」都行！</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-5 px-3 rounded-2xl bg-[#EFECE3] hover:bg-[#E4E0D4] border-2 border-dashed border-[#BDB6A7] flex flex-col items-center justify-center gap-1.5 text-[#2C241E] transition"
                >
                  <ImageIcon className="w-7 h-7 text-[#25385B]" />
                  <span className="text-sm font-black">從相簿選照片</span>
                  <span className="text-[11px] text-[#6E6459]">支援餐點照＆商品熱量表</span>
                </button>
              </div>
            )}

            <div className="px-3 py-2 rounded-xl bg-[#FAF4EB] border border-[#E5CFB3] text-[11px] text-[#5C5044] leading-relaxed space-y-1">
              <div>
                🍱 <b>拍公司自助餐盤秒準秘訣：</b>手機從<b>正上方平拍整盤</b>（拍出分格大小比例）、<b>飯與主菜別疊在一起蓋住</b>，若有深色滷汁或勾芡順手點下方標籤或補 2 個字最準！
              </div>
              <div>
                📦 <b>拍包裝背面：</b>支援高清直讀「<b>營養標示＆成分表</b>」（背面若沒印品名可順手打在下方備註欄 ✨）
              </div>
            </div>

            {/* Initial description + quick chips */}
            <div className="space-y-2">
              <textarea
                rows={2}
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="可補充文字或直接描述（例如：雞腿便當飯吃一半＋無糖綠茶）"
                className="w-full rounded-2xl border border-[#D8D2C5] bg-white px-3.5 py-2.5 text-sm text-[#2C241E] placeholder:text-[#9E9487] focus:outline-none focus:border-[#C83B32]"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendNoteChip(chip)}
                    className="px-2.5 py-1 rounded-full bg-[#EFECE3] hover:bg-[#E4E0D4] text-[11px] font-bold text-[#4A3F35]"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {(!isEditingExisting || Boolean(processedImg) || Boolean(existingPhotoPreview)) && (
              <button
                type="button"
                disabled={analyzing || recalculating}
                onClick={handleRunAiAnalysis}
                className="w-full py-3.5 rounded-2xl bg-[#C83B32] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Quokka & BOBO 正在看照片聞香辨識中（約 3~8 秒）...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {items.length > 0 ? '重新辨識整張照片' : '請 Quokka ＆ BOBO AI 幫我算卡路里！'}
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Offline Taiwan Preset Picker */
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8A7F72] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋高麗菜、蒸蛋、鯖魚、紫米飯、雞腿、蛋餅..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:border-[#C83B32]"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                '全部',
                '自助餐夾菜',
                '早餐店',
                '便當小吃',
                '超商輕食',
                '手搖咖啡',
                '鍋物聚餐',
                '水果點心',
              ].map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setSelectedGroup(grp)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                    selectedGroup === grp
                      ? 'bg-[#25385B] text-white'
                      : 'bg-[#EFECE3] text-[#4A3F35]'
                  }`}
                >
                  {grp === '自助餐夾菜' ? '🍱 自助餐夾菜' : grp}
                </button>
              ))}
            </div>

            {selectedGroup === '自助餐夾菜' && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {[
                  { id: 'all' as const, label: '✨ 全部夾菜 (52)' },
                  { id: 'staple' as const, label: '🍚 飯麵＆例湯' },
                  { id: 'main' as const, label: '🍗 主菜肉魚' },
                  { id: 'egg_tofu' as const, label: '🥚 蛋＆豆腐豆干' },
                  { id: 'veggie' as const, label: '🥬 炒青菜＆配菜' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setBuffetSubFilter(sub.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition ${
                      buffetSubFilter === sub.id
                        ? 'bg-[#F3C85F] border-[#2C241E] text-[#2C241E]'
                        : 'bg-[#FAF8F3] border-[#DDD7C9] text-[#5C5145]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {filteredPresets.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFECE3] gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#2C241E] truncate">{food.name}</div>
                    <div className="text-[11px] text-[#6E6459]">
                      {food.portion} ·{' '}
                      <span className="font-bold text-[#C83B32]">{food.calories} kcal</span>
                      <span className="text-[10px] text-[#8A7E70] ml-1.5">
                        (P {food.proteinG}g)
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => addPresetFood(food, 0.5)}
                      className="px-2 py-1 rounded-lg bg-white text-[11px] font-bold text-[#4A3F35]"
                    >
                      +半份
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetFood(food, 1)}
                      className="px-2.5 py-1 rounded-lg bg-[#485F44] text-white text-[11px] font-bold"
                    >
                      +1份
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetFood(food, 2)}
                      className="px-2 py-1 rounded-lg bg-[#F3C85F]/70 text-[#2C241E] text-[11px] font-bold"
                      title="夾了兩格或雙倍份量"
                    >
                      +2份
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="自訂食物名稱"
                className="flex-1 px-3 py-2 rounded-xl border border-[#D8D2C5] text-xs bg-white"
              />
              <input
                type="text"
                inputMode="numeric"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="大卡"
                className="w-20 px-2.5 py-2 rounded-xl border border-[#D8D2C5] text-xs bg-white"
              />
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-3 py-2 rounded-xl bg-[#F3C85F] text-[#2C241E] font-bold text-xs flex items-center gap-1"
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

        {recalcSuccessMsg && (
          <div className="p-3 rounded-2xl bg-[#E3F1DF] border border-[#9DC395] text-xs font-bold text-[#2F572A]">
            {recalcSuccessMsg}
          </div>
        )}

        {/* === Editable Food Items Breakdown & 1-Tap AI Recalculate Section === */}
        {(items.length > 0 || hasAnalyzed || isEditingExisting) && (
          <div className="space-y-3.5 pt-3 border-t border-[#DDD7C9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PencilLine className="w-4 h-4 text-[#C83B32]" />
                <span className="text-xs font-black text-[#2C241E]">
                  辨識菜色明細（可直接改菜名／份量！）
                </span>
              </div>
              <button
                type="button"
                onClick={addBlankEditableItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFECE3] hover:bg-[#E2DFD4] text-[11px] font-bold text-[#25385B]"
              >
                <Plus className="w-3 h-3" /> 新增漏掉的食物
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6E6459] mb-1">餐點總稱</label>
              <input
                type="text"
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
                placeholder="例如：舒肥雞胸餐盒＋無糖紅茶"
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-sm font-bold text-[#2C241E]"
              />
            </div>

            {/* Editable Item Cards */}
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="p-3 rounded-2xl bg-[#EFECE3] space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#F3C85F] text-[#2C241E] text-[11px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateItemField(it.id, 'name', e.target.value)}
                      placeholder="輸入正確菜名（如：煎豆腐、無糖豆漿）"
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-[#D8D2C5] bg-white text-xs font-bold text-[#2C241E] focus:outline-none focus:border-[#25385B]"
                    />
                    <input
                      type="text"
                      value={it.portion}
                      onChange={(e) => updateItemField(it.id, 'portion', e.target.value)}
                      placeholder="份量 (如 半碗)"
                      className="w-24 px-2.5 py-1.5 rounded-xl border border-[#D8D2C5] bg-white text-xs text-[#4A3F35] focus:outline-none focus:border-[#25385B]"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="p-1.5 text-[#B07268] hover:text-[#7D362B] shrink-0"
                      title="刪除此誤判項目"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pl-7 text-[11px] text-[#6E6459]">
                    <span>
                      蛋白質 {it.proteinG}g · 碳水 {it.carbsG}g · 脂肪 {it.fatG}g
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scaleItem(it.id, 0.5)}
                        className="px-1.5 py-0.5 rounded bg-white text-[10px] font-bold text-[#4A3F35]"
                        title="熱量與份量直接減半"
                      >
                        ×0.5
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={it.calories === 0 ? '' : String(it.calories)}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9]/g, '');
                          updateItemCalories(it.id, cleaned === '' ? 0 : Number(cleaned));
                        }}
                        className="w-16 px-2 py-0.5 rounded-lg border border-[#D8D2C5] bg-white text-xs font-black text-right text-[#C83B32]"
                      />
                      <span>kcal</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Recalculate Box after User Edits */}
            <div
              className={`p-3 rounded-2xl border space-y-2 transition ${
                needsRecalc || correctionNote.trim()
                  ? 'bg-[#F3C85F]/35 border-[#D5A332]'
                  : 'bg-[#FAF8F3] border-[#DDD7C9]'
              }`}
            >
              <div className="text-xs font-black text-[#2C241E]">
                {needsRecalc
                  ? '✨ 偵測到妳修改了菜名或份量！點下方按鈕讓 AI 重新精算卡路里：'
                  : '🔄 若 AI 照片判斷有誤：改完上方菜名／份量，或補充一句修正說明即可重算！'}
              </div>
              <input
                type="text"
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder="選填修正說明（例：其實是清蒸不是油炸、飲料是無糖燕麥奶）"
                className="w-full px-3 py-2 rounded-xl border border-[#D8D2C5] bg-white text-xs text-[#2C241E] placeholder:text-[#9E9487]"
              />
              <button
                type="button"
                disabled={recalculating || analyzing}
                onClick={handleRecalculateFromEdits}
                className="w-full py-2.5 rounded-xl bg-[#25385B] text-white font-black text-xs doodle-btn flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {recalculating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    正在依妳修改的菜色重新計算卡路里...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    依修改後的菜色＆份量，重新計算卡路里！
                  </>
                )}
              </button>
            </div>

            {/* Total Summary + Praise Preview */}
            <div className="p-3.5 rounded-2xl bg-[#F3C85F]/25 border border-[#E5CA7F] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3D342C]">本餐總估算熱量</span>
                <span className="text-xl font-black text-[#C83B32]">{totals.totalCalories} kcal</span>
              </div>
              <div className="text-[11px] text-[#5C5145] flex gap-3">
                <span>🥩 蛋白質 {totals.proteinG}g</span>
                <span>🍚 碳水 {totals.carbsG}g</span>
                <span>🥑 脂肪 {totals.fatG}g</span>
              </div>
              {praise && (
                <p className="text-xs text-[#3D342C] pt-1.5 border-t border-[#E5CA7F]/60 leading-relaxed">
                  🤎 {praise}
                </p>
              )}
            </div>

            {/* Save Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={analyzing || recalculating}
                onClick={() => handleFinalize(false)}
                className="py-3 px-4 rounded-2xl bg-[#EFECE3] text-[#2C241E] font-bold text-sm doodle-btn flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {isEditingExisting ? '儲存修改結果' : '儲存這餐紀錄'}
              </button>
              <button
                type="button"
                disabled={analyzing || recalculating}
                onClick={() => handleFinalize(true)}
                className="py-3 px-4 rounded-2xl bg-[#485F44] text-white font-bold text-sm doodle-btn flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Dumbbell className="w-4 h-4" />
                儲存並搭配 4 分鐘運動！
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
