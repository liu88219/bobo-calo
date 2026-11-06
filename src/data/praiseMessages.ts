import { MealCategory } from '../types/tracker';

const MEAL_PRAISES: Record<MealCategory, string[]> = {
  breakfast: [
    '早安呀！願意好好吃早餐喚醒身體，今天的妳已經先拿一百分囉 🥐✨',
    '哇～這頓早餐看起來好溫暖！矮袋鼠跟 Bobo 陪妳一起開啟元氣滿滿的一天 🤎',
    '有乖乖補充早晨能量真的太棒了！慢慢咀嚼、享受美味吧 ☀️',
  ],
  lunch: [
    '中午辛苦啦！好好吃頓飯犒賞認真生活的自己，身體會謝謝妳喔 🍱💛',
    '看起來超香超美味耶！Bobo 在旁邊聞到都流口水了～吃飽飽心情才會好 🤍',
    '有記得按時吃午餐的妳超棒！吃飯不焦慮，每一口都是滿滿幸福能量 🌿',
  ],
  dinner: [
    '今天一整天辛苦妳了！坐下來好好享受晚餐，把疲憊通通融化掉吧 🍲✨',
    '能好好吃一頓喜歡的晚餐是最棒的療癒！等等矮袋鼠再陪妳輕鬆散步伸展就好 🤎',
    '不管今天忙不忙，有好好餵飽自己就是最溫柔的勝利喔 🍡🌙',
  ],
  snack: [
    '吃點喜歡的小點心超幸福的！快樂荷爾蒙也是健康超重要的一部分喔 🧋💛',
    'Bobo 說：偶爾來點甜甜療癒心靈，充飽電才會更有笑容呀 🤍✨',
    '哇～看起來好療癒！開心享用每一口，完全不需要有任何罪惡感喔 🌸',
  ],
};

export function pickMealPraise(category: MealCategory, calories: number): string {
  if (calories >= 850) {
    const heartyPraises = [
      '哇～今天吃得好豐盛好滿足！享受美食是生活最棒的禮物，等等讓矮袋鼠陪妳做 5 分鐘溫和消食就很棒囉 🤎✨',
      '看起來超級美味耶！偶爾大口吃喜歡的食物超幸福，Bobo 給好好吃飯的妳一個大擁抱 🤍🍡',
    ];
    return heartyPraises[Math.floor(Math.random() * heartyPraises.length)];
  }
  const pool = MEAL_PRAISES[category] || MEAL_PRAISES.lunch;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getWaterPraise(currentMl: number, targetMl: number): string {
  const ratio = targetMl > 0 ? currentMl / targetMl : 0;
  if (currentMl === 0) {
    return '今天也一起跟 Bobo 咕嚕咕嚕喝水吧～先從溫暖的一小口開始 💧🤍';
  }
  if (ratio < 0.35) {
    return '太棒了！已經開始幫身體補水囉，Bobo 在水杯裡開心地吐泡泡 🫧✨';
  }
  if (ratio < 0.7) {
    return '喝水進度快一半囉！妳今天也太會照顧自己了吧，皮膚跟代謝都在發光 💧💛';
  }
  if (ratio < 1) {
    return '哇哇！離今日水水目標只差一點點了，矮袋鼠在旁邊瘋狂幫妳拍手 🦘👏';
  }
  return '🎉 今日喝水目標滿分達成！！妳根本是自律又溫柔的水水小天才，Bobo 超級崇拜妳 🤍👑';
}

export const WORKOUT_COMPLETE_PRAISES: string[] = [
  '太強了吧！！願意動起來的每一秒都閃閃發光，矮袋鼠跟 Bobo 替妳感到超級驕傲 🦘🍡✨',
  '呼～流一點點微汗的感覺超棒對吧！給今天超努力的自己一個大大的擁抱 🤎💛',
  '哇！妳居然真的完成了耶！不用追求完美，每天像這樣溫柔地照顧身體就是最棒的事 🌿👑',
  'Bobo 剛剛在旁邊看得目不轉睛！妳認真的樣子超級可愛又有力量，快喝口水休息一下 🤍💧',
  '叮咚！獲得一枚熱騰騰的烤棉花糖努力印章 🍡 今天也溫柔地完成了跟自己的小約定！',
];

export function pickWorkoutPraise(): string {
  return WORKOUT_COMPLETE_PRAISES[Math.floor(Math.random() * WORKOUT_COMPLETE_PRAISES.length)];
}

export function getDailyGreeting(nickname?: string): { title: string; message: string } {
  const name = nickname?.trim() ? `${nickname.trim()}` : '親愛的妳';
  const hour = new Date().getHours();
  if (hour < 11) {
    return {
      title: `早安，${name} ☀️`,
      message: '今天不用逼自己做到一百分，只要好好吃飯、乖乖喝水，矮袋鼠跟 Bobo 就會一直陪著妳喔 🤎',
    };
  }
  if (hour < 17) {
    return {
      title: `午安，${name} 🌤️`,
      message: '忙裡偷閒深呼吸一下～記得喝幾口水，拍下今天吃了什麼美味好料跟我們分享吧 🤍',
    };
  }
  if (hour < 22) {
    return {
      title: `晚安，${name} 🌙`,
      message: '今天也辛苦妳囉！吃飽後如果想動一動，矮袋鼠已經綁好運動頭帶等妳一起放鬆伸展啦 ✨',
    };
  }
  return {
    title: `夜深囉，${name} 💫`,
    message: '今天已經做得非常棒了！做個輕柔的扭轉伸展，準備窩進被窩做個棉花糖般的好夢吧 🍡',
  };
}
