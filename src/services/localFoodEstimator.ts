import { TAIWAN_FOOD_PRESETS, TaiwanFoodPreset } from '../data/taiwanFoods';
import { pickMealPraise } from '../data/praiseMessages';
import { MealCategory, MealFoodItem } from '../types/tracker';

export interface LocalMealEstimateResult {
  items: MealFoodItem[];
  matchedCount: number;
  unmatchedTokens: string[];
  allMatched: boolean;
  title: string;
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  praise: string;
  smallPlateMode: boolean;
}

interface FoodAlias {
  keyword: string;
  presetId: string;
  /** Default unit scale for water dumplings or specific wordings */
  unitDivisor?: number;
}

// Ordered longer/more-specific aliases before shorter ones during matching
const FOOD_ALIASES: FoodAlias[] = [
  // Bento & staples (specific first)
  { keyword: '健康舒肥雞胸餐盒', presetId: 'tw-bt-3' },
  { keyword: '舒肥雞胸餐盒', presetId: 'tw-bt-3' },
  { keyword: '雞胸餐盒', presetId: 'tw-bt-3' },
  { keyword: '香煎雞腿便當', presetId: 'tw-bt-1' },
  { keyword: '雞腿便當', presetId: 'tw-bt-1' },
  { keyword: '炸排骨便當', presetId: 'tw-bt-2' },
  { keyword: '排骨便當', presetId: 'tw-bt-2' },
  { keyword: '滷大雞腿', presetId: 'tw-bfet-m2' },
  { keyword: '大雞腿', presetId: 'tw-bfet-m2' },
  { keyword: '滷棒棒雞腿', presetId: 'tw-bfet-m1' },
  { keyword: '棒棒雞腿', presetId: 'tw-bfet-m1' },
  { keyword: '小雞腿', presetId: 'tw-bfet-m1' },
  { keyword: '滷雞腿', presetId: 'tw-bfet-m1' },
  { keyword: '烤雞腿排', presetId: 'tw-bfet-m3' },
  { keyword: '照燒雞腿', presetId: 'tw-bfet-m3' },
  { keyword: '雞腿排', presetId: 'tw-bfet-m3' },
  { keyword: '酥炸雞腿排', presetId: 'tw-bfet-m4' },
  { keyword: '炸雞腿', presetId: 'tw-bfet-m4' },
  { keyword: '炸雞排', presetId: 'tw-bfet-m4' },
  { keyword: '雞腿', presetId: 'tw-bfet-m1' },
  { keyword: '火雞肉飯', presetId: 'tw-bt-5' },
  { keyword: '雞肉飯', presetId: 'tw-bt-5' },
  { keyword: '滷肉飯', presetId: 'tw-bt-4' },
  { keyword: '肉燥飯', presetId: 'tw-bt-4' },
  { keyword: '紫米飯', presetId: 'tw-bfet-s2' },
  { keyword: '五穀飯', presetId: 'tw-bfet-s2' },
  { keyword: '黑米飯', presetId: 'tw-bfet-s2' },
  { keyword: '糙米飯', presetId: 'tw-bfet-s3' },
  { keyword: '十穀飯', presetId: 'tw-bfet-s3' },
  { keyword: '白飯', presetId: 'tw-bfet-s1' },
  { keyword: '炒米粉', presetId: 'tw-bfet-s4' },
  { keyword: '炒麵', presetId: 'tw-bfet-s5' },
  { keyword: '烤地瓜', presetId: 'tw-cv-1' },
  { keyword: '蒸地瓜', presetId: 'tw-bfet-s6' },
  { keyword: '地瓜', presetId: 'tw-bfet-s6' },
  { keyword: '南瓜', presetId: 'tw-bfet-s6' },
  { keyword: '玉米濃湯', presetId: 'tw-bfet-s8' },
  { keyword: '酸辣湯', presetId: 'tw-bfet-s8' },
  { keyword: '濃湯', presetId: 'tw-bfet-s8' },
  { keyword: '紫菜蛋花湯', presetId: 'tw-bfet-s7' },
  { keyword: '蛋花湯', presetId: 'tw-bfet-s7' },
  { keyword: '味噌湯', presetId: 'tw-bfet-s7' },
  { keyword: '紫菜湯', presetId: 'tw-bfet-s7' },
  { keyword: '清湯', presetId: 'tw-bfet-s7' },
  // Buffet mains
  { keyword: '白斬雞', presetId: 'tw-bfet-m5' },
  { keyword: '蔥油雞', presetId: 'tw-bfet-m5' },
  { keyword: '滷排骨', presetId: 'tw-bfet-m6' },
  { keyword: '炸排骨', presetId: 'tw-bfet-m7' },
  { keyword: '蒜泥白肉', presetId: 'tw-bfet-m8' },
  { keyword: '蔥爆豬肉', presetId: 'tw-bfet-m9' },
  { keyword: '洋蔥炒肉絲', presetId: 'tw-bfet-m9' },
  { keyword: '炒肉絲', presetId: 'tw-bfet-m9' },
  { keyword: '蔥爆牛肉', presetId: 'tw-bfet-m10' },
  { keyword: '青椒炒牛肉', presetId: 'tw-bfet-m10' },
  { keyword: '宮保雞丁', presetId: 'tw-bfet-m11' },
  { keyword: '辣炒雞丁', presetId: 'tw-bfet-m11' },
  { keyword: '糖醋里肌', presetId: 'tw-bfet-m12' },
  { keyword: '糖醋雞丁', presetId: 'tw-bfet-m12' },
  { keyword: '紅燒獅子頭', presetId: 'tw-bfet-m13' },
  { keyword: '獅子頭', presetId: 'tw-bfet-m13' },
  { keyword: '梅干扣肉', presetId: 'tw-bfet-m14' },
  { keyword: '控肉', presetId: 'tw-bfet-m14' },
  { keyword: '爌肉', presetId: 'tw-bfet-m14' },
  { keyword: '乾煎鯖魚', presetId: 'tw-bfet-m15' },
  { keyword: '鯖魚', presetId: 'tw-bfet-m15' },
  { keyword: '清蒸鱈魚', presetId: 'tw-bfet-m16' },
  { keyword: '鱈魚', presetId: 'tw-bfet-m16' },
  { keyword: '蒸魚', presetId: 'tw-bfet-m16' },
  { keyword: '鮭魚御飯糰', presetId: 'tw-cv-3' },
  { keyword: '御飯糰', presetId: 'tw-cv-3' },
  { keyword: '鮭魚', presetId: 'tw-bfet-m17' },
  // Eggs & tofu
  { keyword: '番茄炒蛋', presetId: 'tw-bfet-e1' },
  { keyword: '蕃茄炒蛋', presetId: 'tw-bfet-e1' },
  { keyword: '九層塔煎蛋', presetId: 'tw-bfet-e2' },
  { keyword: '蔥花蛋', presetId: 'tw-bfet-e2' },
  { keyword: '蔥蛋', presetId: 'tw-bfet-e2' },
  { keyword: '菜脯蛋', presetId: 'tw-bfet-e3' },
  { keyword: '玉米炒蛋', presetId: 'tw-bfet-e3' },
  { keyword: '茶碗蒸', presetId: 'tw-bfet-e4' },
  { keyword: '蒸蛋', presetId: 'tw-bfet-e4' },
  { keyword: '荷包蛋', presetId: 'tw-bfet-e5' },
  { keyword: '煎蛋', presetId: 'tw-bfet-e5' },
  { keyword: '茶葉蛋', presetId: 'tw-bt-9' },
  { keyword: '水煮蛋', presetId: 'tw-bt-9' },
  { keyword: '滷蛋', presetId: 'tw-bt-9' },
  { keyword: '麻婆豆腐', presetId: 'tw-bfet-e6' },
  { keyword: '紅燒豆腐', presetId: 'tw-bfet-e7' },
  { keyword: '板豆腐', presetId: 'tw-bfet-e7' },
  { keyword: '煎豆腐', presetId: 'tw-bfet-e7' },
  { keyword: '豆腐', presetId: 'tw-bfet-e7' },
  { keyword: '滷豆干', presetId: 'tw-bfet-e9' },
  { keyword: '海帶結', presetId: 'tw-bfet-e9' },
  { keyword: '海帶', presetId: 'tw-bfet-e9' },
  { keyword: '炒豆干', presetId: 'tw-bfet-e8' },
  { keyword: '豆干', presetId: 'tw-bfet-e8' },
  { keyword: '豆包', presetId: 'tw-bfet-e10' },
  { keyword: '豆皮', presetId: 'tw-bfet-e10' },
  { keyword: '干絲', presetId: 'tw-bfet-e11' },
  { keyword: '毛豆', presetId: 'tw-bfet-e11' },
  // Veggies
  { keyword: '高麗菜水餃', presetId: 'tw-bt-6', unitDivisor: 10 },
  { keyword: '水餃', presetId: 'tw-bt-6', unitDivisor: 10 },
  { keyword: '高麗菜', presetId: 'tw-bfet-v1' },
  { keyword: '地瓜葉', presetId: 'tw-bfet-v2' },
  { keyword: '空心菜', presetId: 'tw-bfet-v3' },
  { keyword: '菠菜', presetId: 'tw-bfet-v3' },
  { keyword: 'a菜', presetId: 'tw-bfet-v3' },
  { keyword: '青江菜', presetId: 'tw-bfet-v4' },
  { keyword: '小白菜', presetId: 'tw-bfet-v4' },
  { keyword: '油菜', presetId: 'tw-bfet-v4' },
  { keyword: '綠花椰菜', presetId: 'tw-bfet-v5' },
  { keyword: '白花椰菜', presetId: 'tw-bfet-v5' },
  { keyword: '花椰菜', presetId: 'tw-bfet-v5' },
  { keyword: '木耳', presetId: 'tw-bfet-v6' },
  { keyword: '豆芽菜', presetId: 'tw-bfet-v7' },
  { keyword: '豆芽', presetId: 'tw-bfet-v7' },
  { keyword: '絲瓜', presetId: 'tw-bfet-v8' },
  { keyword: '白菜滷', presetId: 'tw-bfet-v9' },
  { keyword: '滷白菜', presetId: 'tw-bfet-v9' },
  { keyword: '桂竹筍', presetId: 'tw-bfet-v10' },
  { keyword: '筍絲', presetId: 'tw-bfet-v10' },
  { keyword: '玉米筍', presetId: 'tw-bfet-v11' },
  { keyword: '四季豆', presetId: 'tw-bfet-v11' },
  { keyword: '甜豆', presetId: 'tw-bfet-v11' },
  { keyword: '三色豆', presetId: 'tw-bfet-v12' },
  { keyword: '玉米粒', presetId: 'tw-bfet-v12' },
  { keyword: '茄子', presetId: 'tw-bfet-v13' },
  { keyword: '苦瓜炒鹹蛋', presetId: 'tw-bfet-v14' },
  { keyword: '苦瓜鹹蛋', presetId: 'tw-bfet-v14' },
  { keyword: '螞蟻上樹', presetId: 'tw-bfet-v15' },
  { keyword: '炒冬粉', presetId: 'tw-bfet-v15' },
  { keyword: '甜不辣', presetId: 'tw-bfet-v16' },
  { keyword: '貢丸', presetId: 'tw-bfet-v16' },
  { keyword: '燙青菜', presetId: 'tw-bt-8' },
  // Breakfast & convenience store & drinks
  { keyword: '起司鮪魚蛋餅', presetId: 'tw-bf-2' },
  { keyword: '鮪魚蛋餅', presetId: 'tw-bf-2' },
  { keyword: '原味蛋餅', presetId: 'tw-bf-1' },
  { keyword: '蛋餅', presetId: 'tw-bf-1' },
  { keyword: '豬肉滿福堡', presetId: 'tw-bf-3' },
  { keyword: '滿福堡', presetId: 'tw-bf-3' },
  { keyword: '里肌豬排蛋吐司', presetId: 'tw-bf-4' },
  { keyword: '豬排蛋吐司', presetId: 'tw-bf-4' },
  { keyword: '鐵板麵', presetId: 'tw-bf-5' },
  { keyword: '傳統飯糰', presetId: 'tw-bf-6' },
  { keyword: '飯糰', presetId: 'tw-bf-6' },
  { keyword: '無糖豆漿', presetId: 'tw-bf-7' },
  { keyword: '溫豆漿', presetId: 'tw-bf-7' },
  { keyword: '豆漿', presetId: 'tw-bf-7' },
  { keyword: '嫩雞胸', presetId: 'tw-cv-2' },
  { keyword: '雞胸肉', presetId: 'tw-cv-2' },
  { keyword: '舒肥雞胸', presetId: 'tw-cv-2' },
  { keyword: '生菜沙拉', presetId: 'tw-cv-4' },
  { keyword: '沙拉', presetId: 'tw-cv-4' },
  { keyword: '無加糖優格', presetId: 'tw-cv-5' },
  { keyword: '優格', presetId: 'tw-cv-5' },
  { keyword: '牛肉麵', presetId: 'tw-bt-7' },
  { keyword: '拿鐵咖啡', presetId: 'tw-dr-1' },
  { keyword: '無糖拿鐵', presetId: 'tw-dr-1' },
  { keyword: '拿鐵', presetId: 'tw-dr-1' },
  { keyword: '美式咖啡', presetId: 'tw-dr-2' },
  { keyword: '黑咖啡', presetId: 'tw-dr-2' },
  { keyword: '美式', presetId: 'tw-dr-2' },
  { keyword: '珍珠鮮奶茶', presetId: 'tw-dr-3' },
  { keyword: '珍珠奶茶', presetId: 'tw-dr-3' },
  { keyword: '珍奶', presetId: 'tw-dr-3' },
  { keyword: '無糖綠茶', presetId: 'tw-dr-4' },
  { keyword: '無糖紅茶', presetId: 'tw-dr-4' },
  { keyword: '無糖烏龍', presetId: 'tw-dr-4' },
  { keyword: '無糖青茶', presetId: 'tw-dr-4' },
  { keyword: '無糖茶', presetId: 'tw-dr-4' },
  { keyword: '綠茶', presetId: 'tw-dr-4' },
  { keyword: '紅茶', presetId: 'tw-dr-4' },
  { keyword: '純茶', presetId: 'tw-dr-4' },
  { keyword: '水果茶', presetId: 'tw-dr-5' },
  { keyword: '柳橙綠', presetId: 'tw-dr-5' },
  { keyword: '涮涮鍋', presetId: 'tw-hp-1' },
  { keyword: '滷味', presetId: 'tw-hp-2' },
  { keyword: '鹽酥雞', presetId: 'tw-hp-3' },
  { keyword: '鹹酥雞', presetId: 'tw-hp-3' },
  { keyword: '香蕉', presetId: 'tw-fr-1' },
  { keyword: '芭樂', presetId: 'tw-fr-2' },
  { keyword: '蘋果', presetId: 'tw-fr-3' },
  { keyword: '巴斯克', presetId: 'tw-fr-4' },
  { keyword: '乳酪蛋糕', presetId: 'tw-fr-4' },
];

const IGNORED_META_RE =
  /^(空盤自己夾.*|空盤夾\d.*|[\d~]+菜.*|自助餐分格盤|沒夾飯.*|配菜瀝油|去皮少油|無糖|微糖去冰|醬汁減半|不喝湯|包裝營養標示.*)$/i;

function parseChineseOrArabicMultiplier(token: string, unitDivisor?: number): {
  scale: number;
  label?: string;
} {
  const clean = token.toLowerCase();

  // Explicit count for dumplings like "8顆水餃" / "水餃10顆"
  if (unitDivisor && unitDivisor > 1) {
    const numMatch = /(\d+(?:\.\d+)?)\s*(?:顆|個|粒|片)/.exec(clean);
    if (numMatch) {
      const count = Number(numMatch[1]);
      if (count > 0 && count <= 40) {
        return { scale: count / unitDivisor, label: `${count}顆` };
      }
    }
  }

  // Fractions & halves
  if (/(?:半碗|半份|半顆|半根|半條|半片|一半|吃一半|1\/2|0\.5份|夾一點|一點點|小撮|少許|小份)/.test(clean)) {
    return { scale: 0.5, label: '半份 / 夾一點' };
  }
  if (/(?:1\/3|三分之一|幾口)/.test(clean)) {
    return { scale: 0.35, label: '約 1/3 份' };
  }
  if (/(?:兩份|兩碗|兩顆|兩根|兩片|雙份|雙倍)/.test(clean)) {
    return { scale: 2, label: '2 份' };
  }
  if (/(?:三份|三顆|三片)/.test(clean)) {
    return { scale: 3, label: '3 份' };
  }

  const mulMatch =
    /(?:×|\*|x)\s*(\d+(?:\.\d+)?)/i.exec(clean) ||
    /(\d+(?:\.\d+)?)\s*(?:份|碗|顆|根|片|條|杯|隻|塊|瓶|包|格)/.exec(clean);
  if (mulMatch) {
    const n = Number(mulMatch[1]);
    if (Number.isFinite(n) && n > 0 && n <= 10 && n !== 1) {
      return { scale: n, label: `${n} 份` };
    }
  }
  return { scale: 1 };
}

function findPresetByToken(token: string): { preset: TaiwanFoodPreset; unitDivisor?: number } | null {
  const lower = token.trim().toLowerCase();
  if (!lower) return null;

  // 1. Direct alias match (already ordered most-specific first)
  for (const alias of FOOD_ALIASES) {
    if (lower.includes(alias.keyword.toLowerCase())) {
      const preset = TAIWAN_FOOD_PRESETS.find((p) => p.id === alias.presetId);
      if (preset) return { preset, unitDivisor: alias.unitDivisor };
    }
  }

  // 2. Fallback exact/substring check against full preset names
  for (const preset of TAIWAN_FOOD_PRESETS) {
    const shortName = preset.name.split(/[（(／/]/)[0].trim().toLowerCase();
    if (shortName.length >= 2 && lower.includes(shortName)) {
      return { preset };
    }
  }
  return null;
}

/**
 * 0.01 秒本機極速熱量比對器：直接依內建「台灣衛福部 TFDA / 自助餐速查庫」拆解食物文字與份量，完全免等雲端！
 */
export function estimateMealLocallyInstant(
  rawText: string,
  category: MealCategory
): LocalMealEstimateResult {
  const trimmed = rawText.trim();
  const smallPlateMode = /(?:每樣都?夾一點|空盤.*小份|都小份|夾一點)/.test(trimmed);

  // Normalize common chip slash-phrases before splitting
  const normalizedInput = trimmed.replace(/紫米\s*[/／]\s*五穀飯/g, '紫米飯');

  // Split by common Chinese/English separators while keeping parenthetical chip notes intact
  const rawTokens = normalizedInput
    .split(/[\n、，,+＋；;]+|\s+(?:和|跟|還有|配)\s+|\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: MealFoodItem[] = [];
  const unmatchedTokens: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (IGNORED_META_RE.test(tok)) continue;

    // Handle explicit "食物名 220大卡" / "吐司 180kcal"
    const explicitKcal = /^([^\d]+?)\s*(\d{1,4})\s*(?:大卡|kcal|卡)$/i.exec(tok);
    if (explicitKcal) {
      const kcal = Math.max(1, Math.round(Number(explicitKcal[2])));
      items.push({
        id: `fast-item-${Date.now()}-${i}`,
        name: explicitKcal[1].trim(),
        portion: '1份（自填熱量）',
        calories: kcal,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      });
      continue;
    }

    const found = findPresetByToken(tok);
    if (!found) {
      unmatchedTokens.push(tok);
      continue;
    }

    const { preset, unitDivisor } = found;
    let { scale, label } = parseChineseOrArabicMultiplier(tok, unitDivisor);

    // Special bento half-rice wording: "雞腿便當飯吃一半" deducts ~140 kcal
    const isBentoHalfRice =
      (preset.id === 'tw-bt-1' || preset.id === 'tw-bt-2') &&
      /飯吃一半|半飯|飯一半/.test(tok);
    if (isBentoHalfRice) {
      const kcal = Math.max(100, preset.calories - 140);
      items.push({
        id: `fast-item-${Date.now()}-${i}`,
        name: `${preset.name}（飯吃一半）`,
        portion: '1個（白飯減半）',
        calories: kcal,
        proteinG: Math.max(0, Math.round((preset.proteinG - 2.5) * 10) / 10),
        carbsG: Math.max(0, Math.round((preset.carbsG - 31) * 10) / 10),
        fatG: preset.fatG,
      });
      continue;
    }

    // In "空盤自己夾(每樣都夾一點)" mode, scale unscaled buffet side dishes to 0.5 automatically!
    if (
      smallPlateMode &&
      scale === 1 &&
      !label &&
      preset.group === '自助餐夾菜' &&
      (preset.buffetSub === 'veggie' || preset.buffetSub === 'egg_tofu')
    ) {
      scale = 0.5;
      label = '夾一點/半份';
    }

    const calories = Math.max(1, Math.round(preset.calories * scale));
    const proteinG = Math.round(preset.proteinG * scale * 10) / 10;
    const carbsG = Math.round(preset.carbsG * scale * 10) / 10;
    const fatG = Math.round(preset.fatG * scale * 10) / 10;
    const displayName = preset.name.split(/[（(]/)[0].trim();

    items.push({
      id: `fast-item-${Date.now()}-${i}`,
      name: displayName,
      portion: label ? `${label} (${preset.portion})` : preset.portion,
      calories,
      proteinG,
      carbsG,
      fatG,
    });
  }

  const totalCalories = items.reduce((s, it) => s + it.calories, 0);
  const proteinG = Math.round(items.reduce((s, it) => s + it.proteinG, 0) * 10) / 10;
  const carbsG = Math.round(items.reduce((s, it) => s + it.carbsG, 0) * 10) / 10;
  const fatG = Math.round(items.reduce((s, it) => s + it.fatG, 0) * 10) / 10;

  return {
    items,
    matchedCount: items.length,
    unmatchedTokens,
    allMatched: items.length > 0 && unmatchedTokens.length === 0,
    title: items.map((x) => x.name).slice(0, 4).join('＋') + (items.length > 4 ? '等' : ''),
    totalCalories,
    proteinG,
    carbsG,
    fatG,
    praise: items.length > 0 ? pickMealPraise(category, totalCalories) : '',
    smallPlateMode,
  };
}

/**
 * 單筆 0.01 秒本機估算（用於新增「AI 沒判讀到的漏抓項目」時即時帶入熱量與三大營養素）
 */
export function estimateSingleFoodItemLocally(
  name: string,
  portion = '1份'
): {
  presetName: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} | null {
  const cleanName = name.trim();
  if (!cleanName) return null;
  const found = findPresetByToken(cleanName);
  if (!found) return null;
  const { scale, label } = parseChineseOrArabicMultiplier(
    `${cleanName} ${portion}`,
    found.unitDivisor
  );
  const p = found.preset;
  return {
    presetName: p.name.split(/[（(]/)[0].trim(),
    portion: portion.trim() || (label ? `${label} (${p.portion})` : p.portion),
    calories: Math.max(1, Math.round(p.calories * scale)),
    proteinG: Math.round(p.proteinG * scale * 10) / 10,
    carbsG: Math.round(p.carbsG * scale * 10) / 10,
    fatG: Math.round(p.fatG * scale * 10) / 10,
  };
}

/**
 * 嘗試以 0.01 秒本機庫直接重算使用者修改的項目清單（無額外修正備註且全部品項命中時啟用）
 */
export function tryRecalculateItemsLocally(
  editedItems: Array<{ name: string; portion: string }>,
  category: MealCategory
): {
  title: string;
  items: MealFoodItem[];
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  praise: string;
} | null {
  if (editedItems.length === 0) return null;
  const out: MealFoodItem[] = [];
  for (let i = 0; i < editedItems.length; i++) {
    const row = editedItems[i];
    const found = findPresetByToken(row.name);
    if (!found) return null;
    const { scale } = parseChineseOrArabicMultiplier(
      `${row.name} ${row.portion}`,
      found.unitDivisor
    );
    const p = found.preset;
    out.push({
      id: `fast-recalc-${Date.now()}-${i}`,
      name: row.name.trim(),
      portion: row.portion.trim() || p.portion,
      calories: Math.max(1, Math.round(p.calories * scale)),
      proteinG: Math.round(p.proteinG * scale * 10) / 10,
      carbsG: Math.round(p.carbsG * scale * 10) / 10,
      fatG: Math.round(p.fatG * scale * 10) / 10,
    });
  }
  const totalCalories = out.reduce((s, x) => s + x.calories, 0);
  return {
    title: out.map((x) => x.name).slice(0, 4).join('＋'),
    items: out,
    totalCalories,
    proteinG: Math.round(out.reduce((s, x) => s + x.proteinG, 0) * 10) / 10,
    carbsG: Math.round(out.reduce((s, x) => s + x.carbsG, 0) * 10) / 10,
    fatG: Math.round(out.reduce((s, x) => s + x.fatG, 0) * 10) / 10,
    praise: pickMealPraise(category, totalCalories),
  };
}
