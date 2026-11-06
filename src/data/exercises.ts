import {
  ExerciseDefinition,
  WorkoutPlaylistItem,
  calculateSecondsForTargetCalories,
} from '../types/tracker';

export const EXERCISES: ExerciseDefinition[] = [
  // === 1. 居家免器材・靜音不傷膝 ===
  {
    id: 'slow_squat',
    name: '慢速靜音深蹲',
    subtitle: '喚醒臀腿最大肌群，完全不跳躍不吵鄰居',
    category: 'silent_home',
    met: 5.0,
    defaultDurationSec: 60,
    steps: [
      '雙腳打開與肩同寬，腳尖微朝外約 15 度',
      '屁股像要往後坐小椅子一樣慢慢往下蹲，重心踩穩腳後跟',
      '膝蓋對齊腳尖方向不內夾，吐氣夾緊屁股穩穩站起來',
    ],
    breathingTip: '吸氣 2 秒慢慢蹲下，吐氣 2 秒溫柔站起',
    quokkaCheer: '矮袋鼠陪妳一起坐隱形小椅子～大腿酸酸代表正在發光喔！',
    tags: ['靜音零跳躍', '緊實臀腿', '高燃脂'],
  },
  {
    id: 'standing_knee_crunch',
    name: '站姿提膝收腹',
    subtitle: '溫和拉高心率、加強腰腹線條的靜音有氧',
    category: 'silent_home',
    met: 4.5,
    defaultDurationSec: 60,
    steps: [
      '雙手輕放在耳後或抱胸前，抬頭挺胸站穩',
      '吐氣時將右膝往上抬，身體微轉讓左手肘靠近右膝',
      '輕輕放回地板（腳尖先落地超安靜！），換另一側交替進行',
    ],
    breathingTip: '抬膝時嘴巴「嘶～」吐氣收緊肚子，放下時鼻子吸氣',
    quokkaCheer: '一二、一二！Bobo 在旁邊跟著妳左右搖擺超開心！',
    tags: ['靜音有氧', '雕塑小腹', '不傷膝'],
  },
  {
    id: 'glute_bridge',
    name: '躺姿療癒臀橋',
    subtitle: '躺在瑜珈墊或床上就能做！提臀又放鬆久坐下背',
    category: 'silent_home',
    met: 3.8,
    defaultDurationSec: 60,
    steps: [
      '仰躺在墊子上，雙膝彎曲踩地，腳跟靠近屁股約一個手掌距離',
      '吐氣時用臀部力量將骨盆往上推高，讓肩膀、髖部、膝蓋呈一直線',
      '在頂點停留 1 秒感受屁股出力，再慢慢一節一節放回墊上',
    ],
    breathingTip: '上推時吐氣收核心（腰不過度拱起），下放時吸氣',
    quokkaCheer: '躺著也能變強壯！Bobo 坐在妳肚子旁邊幫妳數拍子～',
    tags: ['躺著做', '改善久坐', '蜜桃臀'],
  },
  {
    id: 'plank_hold',
    name: '矮袋鼠棒式撐體',
    subtitle: '全身核心一次啟動，打造穩定緊實小蠻腰',
    category: 'silent_home',
    met: 4.0,
    defaultDurationSec: 45,
    steps: [
      '雙手手肘撐在肩膀正下方，前臂平貼墊面',
      '雙腳往後踩地（若覺得太累也可以膝蓋跪地做溫柔版！）',
      '收緊小腹與屁股，從頭頂到腳跟呈一直線，不塌腰也不聳肩',
    ],
    breathingTip: '千萬別憋氣喔！保持細細長長的均勻深呼吸',
    quokkaCheer: '撐住撐住～矮袋鼠也在旁邊流汗發抖陪妳，我們超棒！',
    tags: ['核心緊實', '零噪音', '可跪姿降階'],
  },
  {
    id: 'dead_bug',
    name: '死蟲式核心交替',
    subtitle: '物理治療師最愛！完全不傷脖子與腰椎的瘦小腹神動作',
    category: 'silent_home',
    met: 3.8,
    defaultDurationSec: 60,
    steps: [
      '平躺後雙手舉向天花板，雙腳抬起屈膝呈 90 度（下背緊貼墊子不留空隙！）',
      '吐氣時慢慢將「右手＋左腳」往遠處延伸貼近地面，腰部依然貼緊墊子',
      '吸氣回到中間，換「左手＋右腳」交替延伸',
    ],
    breathingTip: '延伸手腳時慢吐氣把肚臍往地板貼，收回時吸氣',
    quokkaCheer: '這個動作名字可愛又超有效！慢慢做比快快做更厲害喔 🤎',
    tags: ['零頸椎壓力', '平坦小腹', '護腰首選'],
  },
  {
    id: 'side_leg_raise',
    name: '站姿側抬腿雕塑',
    subtitle: '邊聽音樂追劇也能做！溫柔消滅馬鞍肉與水腫',
    category: 'silent_home',
    met: 3.5,
    defaultDurationSec: 60,
    steps: [
      '可單手輕扶牆壁或椅背保持平衡，身體站直不歪斜',
      '將單側腿往正側方平穩抬起約 30～45 度，腳尖朝前不外翻',
      '感受屁股側邊微酸後慢慢放下，做一半時間時換另一隻腳！',
    ],
    breathingTip: '抬腿時吐氣，慢慢放下時吸氣（中途提示時換腳喔）',
    quokkaCheer: '線條正在悄悄變順暢～妳的姿態像天鵝一樣優雅 ✨',
    tags: ['消下半身水腫', '臀側線條', '零負擔'],
  },

  // === 2. 餐後溫和消食＆瑜珈伸展 ===
  {
    id: 'slow_jogging_180',
    name: '原地超慢跑 (180 BPM)',
    subtitle: '餐後穩血糖＆燃脂冠軍！微笑不喘、前腳掌輕落地不傷膝',
    category: 'post_meal_yoga',
    met: 6.0,
    defaultDurationSec: 180,
    hasMetronome180: true,
    steps: [
      '抬頭看前方、肩膀放鬆，手肘自然彎曲在腰際輕擺',
      '膝蓋保持微彎有彈性，用「前腳掌」先輕輕著地再落腳跟（聲音越小越好！）',
      '跟著內建 180 BPM 節拍器「噠、噠、噠、噠」小步快頻率原地輕鬆跑',
    ],
    breathingTip: '保持能邊跑邊微笑講話的「微笑節奏」，自然呼吸不憋氣',
    quokkaCheer: '跟著節拍噠噠噠～矮袋鼠跟 Bobo 一左一右陪妳快樂超慢跑！',
    tags: ['內建180節拍器', '餐後消食王', '高效燃脂不傷膝'],
  },
  {
    id: 'wall_stand',
    name: '餐後靠牆站立消食',
    subtitle: '剛吃飽不想動？貼牆站 3 分鐘幫助消化、改善圓肩駝背！',
    category: 'post_meal_yoga',
    met: 2.3,
    defaultDurationSec: 120,
    steps: [
      '找一面平整牆壁，將腳後跟、小腿肚、屁股、肩胛骨與後腦勺輕貼牆面',
      '收一點點下巴、肩膀往下放鬆遠離耳朵，腰後留約一隻手掌厚度',
      '微收小腹溫柔深呼吸，讓剛吃飽的食物舒服消化不囤積',
    ],
    breathingTip: '深吸氣感受胸口展開，慢吐氣讓小腹溫柔往內收',
    quokkaCheer: '剛吃飽站著最舒服了！Bobo 也貼在牆壁上變扁扁麻糬陪妳 🤍',
    tags: ['剛吃飽首選', '改善體態', '零汗超輕鬆'],
  },
  {
    id: 'cat_cow',
    name: '貓牛式脊椎流動',
    subtitle: '像小貓伸懶腰一樣柔軟背脊、溫柔按摩腸胃助消化',
    category: 'post_meal_yoga',
    met: 2.5,
    defaultDurationSec: 60,
    steps: [
      '四足跪姿在墊上，手腕在肩膀正下方，膝蓋在髖部正下方',
      '【牛式】吸氣時肚臍自然往下沉，胸口打開抬頭往前看',
      '【貓式】吐氣時雙手推地將背部拱高像貓咪伸懶腰，視線看肚臍',
    ],
    breathingTip: '吸氣胸口打開（牛式），吐氣拱背放鬆肩頸（貓式）',
    quokkaCheer: '呼～緊繃了一整天的背跟肩膀，現在通通軟綿綿地鬆開囉 🌿',
    tags: ['舒緩肩背痠痛', '溫柔助消化', '瑜珈放鬆'],
  },
  {
    id: 'downward_dog',
    name: '下犬式全身延展',
    subtitle: '拉長小腿與大腿後側緊繃線條，讓全身氣血順暢循環',
    category: 'post_meal_yoga',
    met: 3.0,
    defaultDurationSec: 60,
    steps: [
      '從四足跪姿開始，雙手手指張開穩推墊面，將屁股往天空推高呈倒 V 字型',
      '膝蓋可以先微彎沒關係！優先讓背部拉直延伸，耳朵在手臂兩側',
      '可以左右腳跟輪流輕踩地板（像原地踩踏板），溫柔伸展小腿肚',
    ],
    breathingTip: '每次吐氣時想像屁股再往斜上方輕輕推遠一點點',
    quokkaCheer: '小腿緊緊的感覺慢慢化開了對吧～線條會越來越修長喔 ✨',
    tags: ['拉長腿部線條', '舒緩小腿腫脹', '全身伸展'],
  },
  {
    id: 'spinal_twist',
    name: '仰臥抱膝扭轉伸展',
    subtitle: '睡前或運動收操最療癒！溫柔促進腸道蠕動、釋放腰背壓力',
    category: 'post_meal_yoga',
    met: 2.3,
    defaultDurationSec: 60,
    steps: [
      '舒服平躺後，抱住右膝靠近胸口，再輕輕將右膝倒向左側地板',
      '右手往右側打開貼地，頭可輕轉看向右手，雙肩盡量貼地放鬆',
      '停留深呼吸感受腰背舒展，一半時間提示音響起時換另一邊！',
    ],
    breathingTip: '每一次長長的吐氣，都讓肩膀跟腰部更沉入墊子裡放鬆',
    quokkaCheer: '做完這個動作今晚一定超好睡～給溫柔照顧身體的妳蓋滿分章 🍡',
    tags: ['腸胃咕嚕操', '運動收操', '睡前療癒'],
  },
];

export function getExerciseById(id: string): ExerciseDefinition {
  return EXERCISES.find((e) => e.id === id) || EXERCISES[0];
}

export type ChallengeIntensity = 'gentle_25' | 'half_50' | 'full_100';

/**
 * 依據目標消耗卡路里，自動搭配一套「熱身消食 ➜ 靜音燃脂 ➜ 瑜珈放鬆」的流暢組合菜單
 */
export function buildMealChallengePlaylist(
  mealCalories: number,
  weightKg: number,
  intensity: ChallengeIntensity
): { targetCalories: number; items: WorkoutPlaylistItem[] } {
  const ratio = intensity === 'gentle_25' ? 0.25 : intensity === 'half_50' ? 0.5 : 1.0;
  const targetCalories = Math.max(25, Math.round(mealCalories * ratio));

  if (targetCalories <= 55) {
    // 輕巧 2~3 動作微消食組合
    const jogCal = Math.round(targetCalories * 0.65);
    const stretchCal = Math.max(8, targetCalories - jogCal);
    return {
      targetCalories,
      items: [
        {
          exerciseId: 'slow_jogging_180',
          durationSec: Math.min(300, calculateSecondsForTargetCalories(6.0, weightKg, jogCal)),
        },
        {
          exerciseId: 'cat_cow',
          durationSec: Math.min(120, calculateSecondsForTargetCalories(2.5, weightKg, stretchCal)),
        },
      ],
    };
  }

  if (targetCalories <= 160) {
    // 黃金 4 動作居家靜音＋消食組合（約 8~16 分鐘）
    const p1 = Math.round(targetCalories * 0.42);
    const p2 = Math.round(targetCalories * 0.26);
    const p3 = Math.round(targetCalories * 0.2);
    const p4 = Math.max(8, targetCalories - p1 - p2 - p3);
    return {
      targetCalories,
      items: [
        {
          exerciseId: 'slow_jogging_180',
          durationSec: calculateSecondsForTargetCalories(6.0, weightKg, p1),
        },
        {
          exerciseId: 'slow_squat',
          durationSec: calculateSecondsForTargetCalories(5.0, weightKg, p2),
        },
        {
          exerciseId: 'standing_knee_crunch',
          durationSec: calculateSecondsForTargetCalories(4.5, weightKg, p3),
        },
        {
          exerciseId: 'cat_cow',
          durationSec: Math.min(120, calculateSecondsForTargetCalories(2.5, weightKg, p4)),
        },
      ],
    };
  }

  // 高目標燃燒組合（分配到超慢跑、深蹲、提膝收腹、臀橋、棒式、下犬式收操）
  const blueprint: Array<{ id: string; met: number; share: number; capSec?: number }> = [
    { id: 'slow_jogging_180', met: 6.0, share: 0.42, capSec: 1200 },
    { id: 'slow_squat', met: 5.0, share: 0.2, capSec: 360 },
    { id: 'standing_knee_crunch', met: 4.5, share: 0.16, capSec: 300 },
    { id: 'glute_bridge', met: 3.8, share: 0.1, capSec: 240 },
    { id: 'plank_hold', met: 4.0, share: 0.07, capSec: 120 },
    { id: 'downward_dog', met: 3.0, share: 0.05, capSec: 120 },
  ];

  return {
    targetCalories,
    items: blueprint.map((b) => {
      const sec = calculateSecondsForTargetCalories(b.met, weightKg, targetCalories * b.share);
      return {
        exerciseId: b.id,
        durationSec: b.capSec ? Math.min(b.capSec, sec) : sec,
      };
    }),
  };
}
