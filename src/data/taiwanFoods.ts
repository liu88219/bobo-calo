export interface TaiwanFoodPreset {
  id: string;
  name: string;
  group: '早餐店' | '便當小吃' | '超商輕食' | '手搖咖啡' | '鍋物聚餐' | '水果點心';
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const TAIWAN_FOOD_PRESETS: TaiwanFoodPreset[] = [
  // 早餐店
  { id: 'tw-bf-1', name: '原味蛋餅', group: '早餐店', portion: '1份', calories: 265, proteinG: 9, carbsG: 28, fatG: 13 },
  { id: 'tw-bf-2', name: '起司鮪魚蛋餅', group: '早餐店', portion: '1份', calories: 385, proteinG: 18, carbsG: 29, fatG: 21 },
  { id: 'tw-bf-3', name: '豬肉滿福堡加蛋', group: '早餐店', portion: '1顆', calories: 390, proteinG: 21, carbsG: 30, fatG: 20 },
  { id: 'tw-bf-4', name: '里肌豬排蛋吐司(去美乃滋)', group: '早餐店', portion: '1份', calories: 350, proteinG: 19, carbsG: 36, fatG: 14 },
  { id: 'tw-bf-5', name: '鐵板麵加蛋', group: '早餐店', portion: '1盤', calories: 560, proteinG: 16, carbsG: 72, fatG: 23 },
  { id: 'tw-bf-6', name: '飯糰(傳統滷蛋油條)', group: '早餐店', portion: '1顆', calories: 480, proteinG: 13, carbsG: 70, fatG: 16 },
  { id: 'tw-bf-7', name: '無糖溫豆漿', group: '早餐店', portion: '中杯 400ml', calories: 135, proteinG: 13, carbsG: 6, fatG: 6 },

  // 便當小吃
  { id: 'tw-bt-1', name: '香煎雞腿便當', group: '便當小吃', portion: '1個', calories: 760, proteinG: 34, carbsG: 88, fatG: 29 },
  { id: 'tw-bt-2', name: '炸排骨便當', group: '便當小吃', portion: '1個', calories: 850, proteinG: 30, carbsG: 96, fatG: 38 },
  { id: 'tw-bt-3', name: '健康舒肥雞胸餐盒(紫米飯)', group: '便當小吃', portion: '1盒', calories: 510, proteinG: 38, carbsG: 62, fatG: 11 },
  { id: 'tw-bt-4', name: '滷肉飯(小碗)', group: '便當小吃', portion: '1碗', calories: 430, proteinG: 10, carbsG: 55, fatG: 19 },
  { id: 'tw-bt-5', name: '火雞肉飯', group: '便當小吃', portion: '1碗', calories: 380, proteinG: 16, carbsG: 52, fatG: 11 },
  { id: 'tw-bt-6', name: '高麗菜水餃 (10顆)', group: '便當小吃', portion: '10顆', calories: 520, proteinG: 21, carbsG: 62, fatG: 20 },
  { id: 'tw-bt-7', name: '牛肉麵(紅燒)', group: '便當小吃', portion: '1碗', calories: 680, proteinG: 35, carbsG: 75, fatG: 26 },
  { id: 'tw-bt-8', name: '燙青菜(少油蔥)', group: '便當小吃', portion: '1盤', calories: 85, proteinG: 3, carbsG: 10, fatG: 4 },
  { id: 'tw-bt-9', name: '滷蛋／茶葉蛋', group: '便當小吃', portion: '1顆', calories: 75, proteinG: 7, carbsG: 1, fatG: 5 },
  { id: 'tw-bt-10', name: '白飯', group: '便當小吃', portion: '半碗', calories: 140, proteinG: 3, carbsG: 31, fatG: 0.3 },

  // 超商輕食
  { id: 'tw-cv-1', name: '超商烤地瓜(中)', group: '超商輕食', portion: '1條 160g', calories: 200, proteinG: 2.5, carbsG: 46, fatG: 0.5 },
  { id: 'tw-cv-2', name: '義式嫩雞胸肉', group: '超商輕食', portion: '1包', calories: 125, proteinG: 24, carbsG: 2, fatG: 2 },
  { id: 'tw-cv-3', name: '鮭魚御飯糰', group: '超商輕食', portion: '1顆', calories: 195, proteinG: 5, carbsG: 36, fatG: 3 },
  { id: 'tw-cv-4', name: '一日野菜生菜沙拉(和風醬)', group: '超商輕食', portion: '1盒', calories: 95, proteinG: 2, carbsG: 15, fatG: 3 },
  { id: 'tw-cv-5', name: '無加糖優格', group: '超商輕食', portion: '1杯', calories: 110, proteinG: 7, carbsG: 9, fatG: 5 },

  // 手搖咖啡
  { id: 'tw-dr-1', name: '拿鐵咖啡(無糖冰/熱)', group: '手搖咖啡', portion: '大杯', calories: 165, proteinG: 9, carbsG: 13, fatG: 8.5 },
  { id: 'tw-dr-2', name: '美式咖啡(無糖)', group: '手搖咖啡', portion: '大杯', calories: 15, proteinG: 1, carbsG: 3, fatG: 0 },
  { id: 'tw-dr-3', name: '珍珠鮮奶茶(微糖)', group: '手搖咖啡', portion: '大杯 700ml', calories: 430, proteinG: 7, carbsG: 78, fatG: 10 },
  { id: 'tw-dr-4', name: '純茶(無糖紅/綠/烏龍/青茶)', group: '手搖咖啡', portion: '大杯 700ml', calories: 5, proteinG: 0, carbsG: 1, fatG: 0 },
  { id: 'tw-dr-5', name: '水果茶／柳橙綠(微糖)', group: '手搖咖啡', portion: '大杯', calories: 240, proteinG: 1, carbsG: 58, fatG: 0.5 },

  // 鍋物聚餐
  { id: 'tw-hp-1', name: '昆布涮涮鍋(梅花豬+菜盤)', group: '鍋物聚餐', portion: '1鍋', calories: 640, proteinG: 36, carbsG: 48, fatG: 32 },
  { id: 'tw-hp-2', name: '健康滷味拼盤(蔬菜+豆腐+肉片+冬粉)', group: '鍋物聚餐', portion: '1碗', calories: 460, proteinG: 26, carbsG: 52, fatG: 16 },
  { id: 'tw-hp-3', name: '鹽酥雞(小份)', group: '鍋物聚餐', portion: '1袋', calories: 520, proteinG: 28, carbsG: 28, fatG: 33 },

  // 水果點心
  { id: 'tw-fr-1', name: '香蕉', group: '水果點心', portion: '1根', calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4 },
  { id: 'tw-fr-2', name: '芭樂', group: '水果點心', portion: '1顆', calories: 110, proteinG: 3, carbsG: 25, fatG: 0.5 },
  { id: 'tw-fr-3', name: '蘋果', group: '水果點心', portion: '1顆', calories: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3 },
  { id: 'tw-fr-4', name: '巴斯克乳酪蛋糕', group: '水果點心', portion: '1切片', calories: 340, proteinG: 6, carbsG: 26, fatG: 24 },
];
