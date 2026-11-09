import {
  ExerciseDefinition,
  WorkoutPlaylistItem,
  DailyWorkoutPlanItem,
  WorkoutLog,
  calculateExerciseCalories,
  calculateSecondsForTargetCalories,
} from '../types/tracker';

export const EXERCISES: ExerciseDefinition[] = [
  // === 1. 💪 天鵝手臂＆肩頸線條 (坐著／床邊也能練，每項簡短 4 分鐘) ===
  {
    id: 'swan_arm_circles',
    name: '4分鐘天鵝手臂畫小圈',
    subtitle: '坐床邊就能做！緊實上手臂線條、練出優雅直角肩',
    category: 'arm_sculpt',
    met: 3.4,
    defaultDurationSec: 240,
    steps: [
      '坐姿或站姿挺胸、肩膀往下沉遠離耳朵，雙手向兩側平舉呈 T 字型',
      '手臂打直延伸，指尖像往遠方拉長一樣，用肩膀與上手臂力量畫硬幣大小的小圈',
      '前 2 分鐘往前畫圈，聽到換邊鈴聲後改往後畫圈 2 分鐘！',
    ],
    breathingTip: '保持均勻深呼吸不聳肩，手酸酸熱熱代表掰掰袖正在燃燒喔',
    quokkaCheer: 'Quokka 跟著妳一起張開小短手畫圈圈～天鵝手臂養成中 ✨',
    tags: ['4分鐘短練', '緊實掰掰袖', '直角肩', '坐床邊可做'],
  },
  {
    id: 'bye_bye_arm_pulse',
    name: '4分鐘掰掰袖後推脈衝',
    subtitle: '精準鎖定手臂後側蝴蝶袖，順便打開滑手機圓肩駝背！',
    category: 'arm_sculpt',
    met: 3.5,
    defaultDurationSec: 240,
    steps: [
      '上半身微前傾或坐挺，雙手手臂往身體後方延伸打直，掌心朝上或相對',
      '保持手肘伸直不彎曲，將雙手往後上方小幅度「輕推脈衝」',
      '每次上推時感受上手臂後側緊緊出力，脖子保持放鬆拉長',
    ],
    breathingTip: '往上輕推時吐氣，回放一點點時吸氣，節奏輕快穩定',
    quokkaCheer: '跟鬆鬆掰掰肉說掰掰！BOBO 在旁邊幫妳數一二一二 🤍',
    tags: ['4分鐘短練', '專攻蝴蝶袖', '改善圓肩', '免器材'],
  },
  {
    id: 'angel_wings_pull',
    name: '4分鐘 W 字美背瘦手臂',
    subtitle: '瘦手臂同時削薄厚背！坐著追劇也能練出少女薄背線條',
    category: 'arm_sculpt',
    met: 3.5,
    defaultDurationSec: 240,
    steps: [
      '雙手往上斜舉成 Y 字型，掌心朝前、肩膀放鬆不聳肩',
      '吐氣時彎曲手肘往下拉到身體兩側，呈現「W 字型」並感受肩胛骨往中間夾緊',
      '停留 1 秒感受手臂與背部發熱，吸氣再溫柔舉回上方',
    ],
    breathingTip: '下拉成 W 字時吐氣開胸，上舉時深吸氣延伸',
    quokkaCheer: '背變薄整個人看起來就超輕盈～妳的體態越來越好看囉 🤎',
    tags: ['4分鐘短練', '少女薄背', '手臂線條', '坐床邊可做'],
  },
  {
    id: 'prayer_chest_press',
    name: '4分鐘合十互推收副乳',
    subtitle: '雙掌合十溫柔出力，緊實上手臂內側與胸前副乳線條',
    category: 'arm_sculpt',
    met: 3.2,
    defaultDurationSec: 240,
    steps: [
      '雙手手掌在胸前合十，手肘抬高至與手腕平行呈水平線',
      '雙掌用力互相推緊（會感覺胸口與手臂內側立刻收緊！）',
      '維持互推力道，慢慢將合十雙手往上推高 10 公分再回到胸前',
    ],
    breathingTip: '上推時慢吐氣保持掌心貼緊，下放回胸前時吸氣',
    quokkaCheer: '看起來超優雅的小動作，其實手臂內側超有感對吧 ✨',
    tags: ['4分鐘短練', '收緊副乳', '手臂內側', '零噪音'],
  },

  // === 2. 🛏️ 床上懶人躺練專區 (洗完澡躺上床直接練，每項簡短 4 分鐘) ===
  {
    id: 'bed_air_bike',
    name: '4分鐘床上空中腳踏車',
    subtitle: '躺在被窩上就能踩！消下半身水腫、緊實小腹與大腿線條',
    category: 'bed_workout',
    met: 4.2,
    defaultDurationSec: 240,
    steps: [
      '舒服平躺在床上（頭下可墊薄枕頭），雙手自然放身體兩側穩定骨盆',
      '雙腿抬起，像在半空中慢速踩腳踏車一樣輪流往前畫大圈延伸',
      '下背輕貼床面不懸空，腳尖可交替勾腳與壓腳背幫助小腿消水腫！',
    ],
    breathingTip: '自然均勻呼吸不憋氣，慢速畫大圈比亂踢更瘦腿喔',
    quokkaCheer: '躺著踩單車去棉花糖村郊遊囉～BOBO 坐在枕頭邊陪妳 🤍',
    tags: ['4分鐘短練', '床上躺練', '瘦腿消水腫', '平坦小腹'],
  },
  {
    id: 'bed_clamshell_leg',
    name: '4分鐘側躺抬腿瘦馬鞍肉',
    subtitle: '側躺滑手機也能做！緊實大腿內外側與臀側微笑線',
    category: 'bed_workout',
    met: 3.5,
    defaultDurationSec: 240,
    steps: [
      '側躺在床上，單手托頭或躺枕頭，下方腿微彎穩定身體',
      '上方腿打直，溫柔往天花板方向抬起約 40 度，腳尖朝前不往上翻',
      '慢慢控制下放不完全貼回，2 分鐘鈴響時翻身換另一邊繼續！',
    ],
    breathingTip: '抬腿時吐氣收核心，慢慢放下時吸氣（中途會提醒換邊！）',
    quokkaCheer: '側躺著也能悄悄變美！翻個身再練 2 分鐘就大功告成囉 🛏️',
    tags: ['4分鐘短練', '床上側躺', '消馬鞍肉', '追劇神器'],
  },
  {
    id: 'bed_glute_bridge',
    name: '4分鐘床上躺姿臀橋',
    subtitle: '躺床就能提臀＋釋放久坐腰痠，睡前做超舒服！',
    category: 'bed_workout',
    met: 3.8,
    defaultDurationSec: 240,
    steps: [
      '平躺在床上移開高枕頭，雙膝彎曲踩穩床面，雙腳與髖同寬',
      '吐氣時用屁股力量將骨盆往上推起，讓肩膀、髖部、膝蓋呈一直線',
      '在頂點夾緊臀部停留 1～2 秒，再一節一節溫柔放回床面',
    ],
    breathingTip: '上推時吐氣收小腹（腰不死命拱高），下放時深吸氣',
    quokkaCheer: '躺著練出漂亮臀線！做完腰背鬆鬆的超好睡喔 🌙',
    tags: ['4分鐘短練', '床上躺練', '緊實提臀', '舒緩腰痠'],
  },
  {
    id: 'bed_dead_bug',
    name: '4分鐘床上死蟲式瘦小腹',
    subtitle: '完全不傷脖子與腰椎！躺床就能喚醒深層平坦小腹',
    category: 'bed_workout',
    met: 3.8,
    defaultDurationSec: 240,
    steps: [
      '平躺床面，雙手舉向天花板，雙腿屈膝抬起呈 90 度',
      '吐氣時慢慢將「右手＋左腳」往遠處延伸，肚子微收貼穩床面',
      '吸氣回到中間，換「左手＋右腳」溫柔交替延伸',
    ],
    breathingTip: '延伸手腳時慢吐氣把肚臍往床墊收，收回時吸氣',
    quokkaCheer: '同時動手又動腳～手臂跟小腹一起變緊緻啦 🤎',
    tags: ['4分鐘短練', '床上躺練', '零頸椎壓力', '瘦小腹'],
  },
  {
    id: 'bed_spinal_twist',
    name: '4分鐘床上抱膝扭轉舒眠',
    subtitle: '睡前必做收操！放鬆緊繃腰背、促進腸道咕嚕蠕動',
    category: 'bed_workout',
    met: 2.4,
    defaultDurationSec: 240,
    steps: [
      '躺在床上抱住右膝靠近胸口，再輕輕把右膝倒向左側床面',
      '右手往右側打開平放（順便拉開胸口與手臂內側筋膜！），雙肩放鬆貼床',
      '深呼吸享受伸展，2 分鐘鈴響時換抱左膝倒向另一邊！',
    ],
    breathingTip: '每次長長的吐氣，讓肩膀、手臂與後腰完全融化進床鋪裡',
    quokkaCheer: '辛苦一整天了～做完這個伸展直接蓋被子睡個香甜好覺吧 🤍',
    tags: ['4分鐘短練', '床上睡前', '開胸展臂', '助眠消脹氣'],
  },

  // === 3. 🧘‍♀️ 餐後消食＆居家靜音 (每項簡短 4 分鐘) ===
  {
    id: 'slow_jogging_180',
    name: '4分鐘原地超慢跑 (180 BPM)',
    subtitle: '餐後穩血糖消食王！跟著內建 180 步頻節拍輕鬆跑 4 分鐘',
    category: 'post_meal_silent',
    met: 6.0,
    defaultDurationSec: 240,
    hasMetronome180: true,
    steps: [
      '抬頭微笑看前方，手肘自然彎曲在腰際輕輕擺動（順便帶動手臂！）',
      '膝蓋保持微彎彈性，前腳掌先輕著地再落腳跟，安靜不傷膝',
      '跟著內建 180 BPM 節拍器「噠、噠、噠、噠」跑完短短 4 分鐘就達標！',
    ],
    breathingTip: '保持能邊跑邊微笑哼歌的輕鬆節奏，完全不用跑快喔',
    quokkaCheer: '短短 4 分鐘超快就過了！Quokka 跟 BOBO 陪妳噠噠噠快樂跑 ♪~',
    tags: ['4分鐘短練', '內建180節拍', '餐後消食王', '高燃脂'],
  },
  {
    id: 'wall_stand',
    name: '4分鐘餐後貼牆開肩消食',
    subtitle: '剛吃飽不想動首選！貼牆站 4 分鐘助消化、打開圓肩練體態',
    category: 'post_meal_silent',
    met: 2.4,
    defaultDurationSec: 240,
    steps: [
      '找一面牆，將腳跟、小腿、屁股、肩胛骨與後腦勺輕貼牆面',
      '手臂自然貼在身體兩側手背輕靠牆（立刻打開鎖骨與肩頸線條！）',
      '微收小腹溫柔深呼吸 4 分鐘，讓剛吃飽的食物舒服消化不囤小腹',
    ],
    breathingTip: '吸氣展開胸口與鎖骨，慢吐氣讓小腹溫柔往內收',
    quokkaCheer: '只要乖乖貼牆站 4 分鐘就贏過躺著不動囉！妳超棒 ✨',
    tags: ['4分鐘短練', '剛吃飽首選', '開肩美姿', '零汗超輕鬆'],
  },
  {
    id: 'slow_squat',
    name: '4分鐘慢速靜音深蹲＋平舉',
    subtitle: '蹲下時雙手往前平舉延伸，下半身燃脂同時雕塑手臂線條！',
    category: 'post_meal_silent',
    met: 5.0,
    defaultDurationSec: 240,
    steps: [
      '雙腳與肩同寬，往後坐隱形小椅子時「雙手同步往前平舉打直」練手臂',
      '重心踩穩腳後跟、膝蓋對齊腳尖，站起時雙手往身體兩側後壓夾背',
      '不求快，穩穩呼吸做滿 4 分鐘，全身大肌群一次暖起來！',
    ],
    breathingTip: '吸氣往下蹲＋雙手前平舉，吐氣站起＋雙手往後壓',
    quokkaCheer: '手腳一起動效率翻倍！4 分鐘馬上就完成囉 🔥',
    tags: ['4分鐘短練', '手腿同練', '靜音零跳躍'],
  },
  {
    id: 'cat_cow',
    name: '4分鐘床上／墊上貓牛式',
    subtitle: '在床上也能做的柔軟背脊操！順便撐地緊實手臂與肩膀穩定度',
    category: 'post_meal_silent',
    met: 2.6,
    defaultDurationSec: 240,
    steps: [
      '在瑜珈墊或較穩的床面上呈四足跪姿，雙手推穩在肩膀正下方（手臂打直不鎖死）',
      '吸氣時肚臍微沉、胸口往前打開抬頭（牛式）',
      '吐氣時雙手推地把背部拱高像貓咪伸懶腰（貓式），溫柔按摩腸胃',
    ],
    breathingTip: '吸氣開胸延伸鎖骨，吐氣推地拱背放鬆肩頸',
    quokkaCheer: '像軟綿綿的小貓咪一樣伸懶腰～背跟手臂都舒展開啦 🌿',
    tags: ['4分鐘短練', '床上可做', '舒緩肩背', '溫柔助消化'],
  },
];

export function getExerciseById(id: string): ExerciseDefinition {
  return EXERCISES.find((e) => e.id === id) || EXERCISES[0];
}

export type ChallengeIntensity =
  | 'quick_4min_arm_bed'
  | 'gentle_25'
  | 'half_50'
  | 'full_100';

/**
 * 依據使用者偏好：支援「黃金 4 分鐘手部＋床上短組合」或依餐點熱量搭配「每項約 4 分鐘 (240s)」的簡短跟練菜單
 */
export function buildMealChallengePlaylist(
  mealCalories: number,
  weightKg: number,
  intensity: ChallengeIntensity
): { targetCalories: number; items: WorkoutPlaylistItem[] } {
  if (intensity === 'quick_4min_arm_bed') {
    // 剛好 4 分鐘（4 個無負擔動作 × 各 60 秒 = 240 秒），結合手部線條＋床上躺練！
    return {
      targetCalories: Math.max(18, Math.round(3.8 * Math.max(40, weightKg) * (240 / 3600) * 1.05)),
      items: [
        { exerciseId: 'swan_arm_circles', durationSec: 60 },
        { exerciseId: 'bye_bye_arm_pulse', durationSec: 60 },
        { exerciseId: 'bed_air_bike', durationSec: 60 },
        { exerciseId: 'bed_glute_bridge', durationSec: 60 },
      ],
    };
  }

  const ratio = intensity === 'gentle_25' ? 0.25 : intensity === 'half_50' ? 0.5 : 1.0;
  const targetCalories = Math.max(20, Math.round(mealCalories * ratio));

  // 將每個動作控制在簡短好堅持的 ~4 分鐘 (180s ~ 240s) 區間！
  const clampShort4Min = (sec: number) => Math.min(240, Math.max(120, sec));

  if (targetCalories <= 65) {
    return {
      targetCalories,
      items: [
        { exerciseId: 'swan_arm_circles', durationSec: 240 },
        { exerciseId: 'bed_air_bike', durationSec: 240 },
      ],
    };
  }

  if (targetCalories <= 150) {
    return {
      targetCalories,
      items: [
        {
          exerciseId: 'slow_jogging_180',
          durationSec: clampShort4Min(
            calculateSecondsForTargetCalories(6.0, weightKg, targetCalories * 0.45)
          ),
        },
        {
          exerciseId: 'swan_arm_circles',
          durationSec: 240,
        },
        {
          exerciseId: 'bed_air_bike',
          durationSec: 240,
        },
      ],
    };
  }

  // 較高目標時拆成多個簡短 4 分鐘動作組合（手部線條＋床上躺練＋超慢跑），絕不出現單一動作超過 4 分鐘！
  const pool = [
    'slow_jogging_180',
    'swan_arm_circles',
    'bed_air_bike',
    'bye_bye_arm_pulse',
    'bed_glute_bridge',
    'bed_clamshell_leg',
    'angel_wings_pull',
    'bed_spinal_twist',
  ];

  const items: WorkoutPlaylistItem[] = [];
  let accKcal = 0;
  for (const id of pool) {
    if (accKcal >= targetCalories && items.length >= 3) break;
    const def = getExerciseById(id);
    const dur = 240; // 每個動作固定簡短 4 分鐘！
    const burn = Math.round(def.met * Math.max(40, weightKg) * (dur / 3600) * 1.05);
    items.push({ exerciseId: id, durationSec: dur });
    accKcal += burn;
  }

  return { targetCalories, items };
}

const DAILY_PLAN_POOLS: string[][] = [
  [
    'swan_arm_circles',
    'bed_air_bike',
    'slow_jogging_180',
    'bye_bye_arm_pulse',
    'bed_glute_bridge',
    'angel_wings_pull',
    'slow_squat',
    'bed_dead_bug',
    'prayer_chest_press',
    'bed_clamshell_leg',
    'wall_stand',
    'bed_spinal_twist',
  ],
  [
    'bye_bye_arm_pulse',
    'bed_glute_bridge',
    'slow_squat',
    'angel_wings_pull',
    'bed_dead_bug',
    'slow_jogging_180',
    'swan_arm_circles',
    'bed_clamshell_leg',
    'bed_air_bike',
    'cat_cow',
    'prayer_chest_press',
    'wall_stand',
  ],
  [
    'angel_wings_pull',
    'bed_clamshell_leg',
    'bed_air_bike',
    'prayer_chest_press',
    'slow_jogging_180',
    'bed_spinal_twist',
    'swan_arm_circles',
    'bed_glute_bridge',
    'slow_squat',
    'bye_bye_arm_pulse',
    'bed_dead_bug',
    'cat_cow',
  ],
];

/**
 * 依據「每日目標消耗卡路里」自動制定專屬運動項目清單（每項控制在 1～4 分鐘內，優先搭配手部雕塑與床上躺練）
 */
export function buildDailyCalorieTargetPlan(
  targetKcal: number,
  weightKg: number,
  variantSeed = 0
): DailyWorkoutPlanItem[] {
  const safeTarget = Math.max(15, Math.min(800, Math.round(targetKcal || 80)));
  const basePool = DAILY_PLAN_POOLS[Math.abs(variantSeed) % DAILY_PLAN_POOLS.length];
  const shift = Math.floor(Math.abs(variantSeed) / DAILY_PLAN_POOLS.length) % basePool.length;
  const orderedPool = [...basePool.slice(shift), ...basePool.slice(0, shift)];

  const items: DailyWorkoutPlanItem[] = [];
  let remaining = safeTarget;
  let cursor = 0;

  while (remaining > 0 && items.length < 14) {
    const exId = orderedPool[cursor % orderedPool.length];
    cursor += 1;
    const def = getExerciseById(exId);
    const full4MinBurn = calculateExerciseCalories(def.met, weightKg, 240);

    if (remaining > full4MinBurn + 5) {
      items.push({
        id: `plan-${variantSeed}-${items.length + 1}-${exId}`,
        exerciseId: exId,
        durationSec: 240,
      });
      remaining -= full4MinBurn;
    } else {
      const exactSec = Math.min(
        240,
        Math.max(45, calculateSecondsForTargetCalories(def.met, weightKg, remaining))
      );
      const actualBurn = calculateExerciseCalories(def.met, weightKg, exactSec);
      items.push({
        id: `plan-${variantSeed}-${items.length + 1}-${exId}`,
        exerciseId: exId,
        durationSec: exactSec,
      });
      remaining -= actualBurn;
      if (remaining < 5) break;
    }
  }

  return items;
}

/**
 * 比對今日計畫項目與今日已完成運動紀錄（同時支援指定打卡 planItemId 與同動作名稱自動歸戶）
 */
export function matchCompletedPlanItems(
  planItems: DailyWorkoutPlanItem[],
  dayWorkouts: WorkoutLog[]
): Record<string, WorkoutLog> {
  const matched: Record<string, WorkoutLog> = {};
  const usedWorkoutIds = new Set<string>();

  // Pass 1: 優先配對明確綁定 planItemId 的完成紀錄
  for (const item of planItems) {
    const exact = dayWorkouts.find(
      (w) => w.planItemId === item.id && !usedWorkoutIds.has(w.id)
    );
    if (exact) {
      matched[item.id] = exact;
      usedWorkoutIds.add(exact.id);
    }
  }

  // Pass 2: 若使用者從圖鑑單獨跟練了相同動作，也貼心自動算入今日計畫完成！
  for (const item of planItems) {
    if (matched[item.id]) continue;
    const byExercise = dayWorkouts.find(
      (w) => !w.planItemId && w.exerciseId === item.exerciseId && !usedWorkoutIds.has(w.id)
    );
    if (byExercise) {
      matched[item.id] = byExercise;
      usedWorkoutIds.add(byExercise.id);
    }
  }

  return matched;
}
