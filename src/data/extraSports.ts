export type ExtraSportCategory = 'dance' | 'ball' | 'fitness';

export type SportEffortLevel = 'light' | 'normal' | 'intense';

export interface ExtraSportDefinition {
  id: string;
  name: string;
  emoji: string;
  category: ExtraSportCategory;
  met: number;
  defaultMinutes: number;
  hint: string;
}

export const SPORT_EFFORT_META: Record<
  SportEffortLevel,
  { label: string; factor: number; desc: string }
> = {
  light: {
    label: '🌱 輕鬆休閒／含休息',
    factor: 0.82,
    desc: '邊聊天邊動、中間有休息喝水（約 82% 強度）',
  },
  normal: {
    label: '✨ 正常流汗練習',
    factor: 1.0,
    desc: '穩定跟課排練或正常對打微喘流汗（標準 100% MET）',
  },
  intense: {
    label: '🔥 全力爆汗高強度',
    factor: 1.18,
    desc: '連續跑動殺球或高強度雕舞爆汗（約 118% 強度）',
  },
};

export const EXTRA_SPORTS: ExtraSportDefinition[] = [
  // === 💃 舞蹈專區 ===
  {
    id: 'sport_kpop_dance',
    name: 'K-pop 韓團舞／MV 排練',
    emoji: '💃',
    category: 'dance',
    met: 5.8,
    defaultMinutes: 60,
    hint: '含暖身、分解動作與整首連跳排練',
  },
  {
    id: 'sport_street_jazz',
    name: '街舞 (Hip-hop / Jazz / GirlStyle)',
    emoji: '🕺',
    category: 'dance',
    met: 6.2,
    defaultMinutes: 60,
    hint: '節奏感強、大量核心與全身律動',
  },
  {
    id: 'sport_zumba_aerobic',
    name: '有氧熱舞／Zumba',
    emoji: '🎶',
    category: 'dance',
    met: 6.5,
    defaultMinutes: 50,
    hint: '不間斷音樂跟跳、心率提升快',
  },
  {
    id: 'sport_gentle_dance',
    name: '基礎律動／性感雕塑舞',
    emoji: '✨',
    category: 'dance',
    met: 4.5,
    defaultMinutes: 60,
    hint: '注重波浪延伸、體態控制與局部線條',
  },
  {
    id: 'sport_ballet_modern',
    name: '現代舞／芭蕾雕塑 (Barre)',
    emoji: '🩰',
    category: 'dance',
    met: 5.0,
    defaultMinutes: 60,
    hint: '深層核心穩定與修長肌肉控制',
  },

  // === 🏸 球類運動專區 ===
  {
    id: 'sport_badminton_double',
    name: '羽球（雙打／社團對打）',
    emoji: '🏸',
    category: 'ball',
    met: 5.5,
    defaultMinutes: 90,
    hint: '台灣最常見社團雙打節奏（若含場邊等場可選輕鬆休閒）',
  },
  {
    id: 'sport_badminton_single',
    name: '羽球（單打／連續殺球跑動）',
    emoji: '🏸',
    category: 'ball',
    met: 7.0,
    defaultMinutes: 60,
    hint: '全場前後折返跑動、高心率燃脂',
  },
  {
    id: 'sport_pickleball',
    name: '匹克球 (Pickleball)',
    emoji: '🏓',
    category: 'ball',
    met: 5.2,
    defaultMinutes: 60,
    hint: '輕快反應對打、手眼協調超紓壓',
  },
  {
    id: 'sport_table_tennis',
    name: '桌球',
    emoji: '🏓',
    category: 'ball',
    met: 4.2,
    defaultMinutes: 60,
    hint: '快速揮拍與碎步移動',
  },
  {
    id: 'sport_tennis',
    name: '網球',
    emoji: '🎾',
    category: 'ball',
    met: 6.8,
    defaultMinutes: 60,
    hint: '全身旋轉發力與底線跑動',
  },
  {
    id: 'sport_volleyball',
    name: '排球',
    emoji: '🏐',
    category: 'ball',
    met: 4.5,
    defaultMinutes: 60,
    hint: '跳躍攔網、接發球與團隊走位',
  },
  {
    id: 'sport_basketball',
    name: '籃球（半場對打／投籃練習）',
    emoji: '🏀',
    category: 'ball',
    met: 6.0,
    defaultMinutes: 60,
    hint: '跑動切入、防守與跳投',
  },

  // === 🧘‍♀️ 健身／有氧／戶外日常 ===
  {
    id: 'sport_pilates_yoga',
    name: '器械皮拉提斯／瑜珈課',
    emoji: '🧘‍♀️',
    category: 'fitness',
    met: 3.6,
    defaultMinutes: 60,
    hint: '深層核心收緊、拉長身形線條',
  },
  {
    id: 'sport_weight_training',
    name: '健身房重訓／臀腿肌力',
    emoji: '🏋️‍♀️',
    category: 'fitness',
    met: 4.8,
    defaultMinutes: 60,
    hint: '含組間休息的器械或啞鈴肌力訓練',
  },
  {
    id: 'sport_jogging_treadmill',
    name: '戶外慢跑／跑步機爬坡走',
    emoji: '🏃‍♀️',
    category: 'fitness',
    met: 7.2,
    defaultMinutes: 40,
    hint: '穩定有氧燃脂（時速約 7~8 km 或坡度快走）',
  },
  {
    id: 'sport_spinning_bike',
    name: '飛輪課／河濱騎單車',
    emoji: '🚴‍♀️',
    category: 'fitness',
    met: 6.5,
    defaultMinutes: 45,
    hint: '下半身大肌群高效率消耗',
  },
  {
    id: 'sport_swimming',
    name: '游泳',
    emoji: '🏊‍♀️',
    category: 'fitness',
    met: 6.5,
    defaultMinutes: 45,
    hint: '零關節負擔全身燃脂雕塑',
  },
  {
    id: 'sport_brisk_walk',
    name: '飯後快走／逛街散步',
    emoji: '👟',
    category: 'fitness',
    met: 3.5,
    defaultMinutes: 40,
    hint: '輕鬆累積步數、幫助消化穩血糖',
  },
];

export function calculateExtraSportCalories(params: {
  met: number;
  weightKg: number;
  minutes: number;
  effort: SportEffortLevel;
}): number {
  const safeWeight = Math.max(35, params.weightKg || 54);
  const safeMinutes = Math.max(1, params.minutes || 30);
  const factor = SPORT_EFFORT_META[params.effort]?.factor ?? 1.0;
  const hours = safeMinutes / 60;
  return Math.max(5, Math.round(params.met * factor * safeWeight * hours * 1.05));
}
