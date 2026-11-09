export type TaiwanFoodGroup =
  | '自助餐夾菜'
  | '早餐店'
  | '便當小吃'
  | '超商輕食'
  | '手搖咖啡'
  | '鍋物聚餐'
  | '水果點心';

export type BuffetSubType = 'staple' | 'main' | 'egg_tofu' | 'veggie';

export interface TaiwanFoodPreset {
  id: string;
  name: string;
  group: TaiwanFoodGroup;
  buffetSub?: BuffetSubType;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const TAIWAN_FOOD_PRESETS: TaiwanFoodPreset[] = [
  // === 🍱 平日公司員餐／台式自助餐夾菜專區（依台灣自助餐分格盤 1格≈80g 實測） ===
  // 1. 主食＆例湯 (staple)
  { id: 'tw-bfet-s1', name: '白飯（自助餐平碗）', group: '自助餐夾菜', buffetSub: 'staple', portion: '1平碗 200g', calories: 280, proteinG: 5.5, carbsG: 62, fatG: 0.6 },
  { id: 'tw-bfet-s2', name: '紫米飯／黑米五穀飯', group: '自助餐夾菜', buffetSub: 'staple', portion: '1平碗 200g', calories: 265, proteinG: 6.5, carbsG: 57, fatG: 1.4 },
  { id: 'tw-bfet-s3', name: '糙米飯／十穀飯', group: '自助餐夾菜', buffetSub: 'staple', portion: '1平碗 200g', calories: 260, proteinG: 6, carbsG: 56, fatG: 1.5 },
  { id: 'tw-bfet-s4', name: '台式炒米粉（配菜格）', group: '自助餐夾菜', buffetSub: 'staple', portion: '1格 100g', calories: 185, proteinG: 3.5, carbsG: 28, fatG: 6.5 },
  { id: 'tw-bfet-s5', name: '家常炒麵／油麵（配菜格）', group: '自助餐夾菜', buffetSub: 'staple', portion: '1格 110g', calories: 205, proteinG: 5.5, carbsG: 30, fatG: 7 },
  { id: 'tw-bfet-s6', name: '清蒸地瓜／帶皮南瓜塊', group: '自助餐夾菜', buffetSub: 'staple', portion: '1格 90g', calories: 105, proteinG: 1.6, carbsG: 24, fatG: 0.3 },
  { id: 'tw-bfet-s7', name: '自助餐清湯（紫菜蛋花／味噌湯）', group: '自助餐夾菜', buffetSub: 'staple', portion: '1小碗', calories: 55, proteinG: 3.5, carbsG: 4.5, fatG: 2.2 },
  { id: 'tw-bfet-s8', name: '自助餐濃湯（玉米濃湯／酸辣羹湯）', group: '自助餐夾菜', buffetSub: 'staple', portion: '1小碗', calories: 135, proteinG: 3.5, carbsG: 18, fatG: 5.5 },

  // 2. 肉類＆海鮮主菜 (main)
  { id: 'tw-bfet-m1', name: '滷棒棒雞腿（小雞腿）', group: '自助餐夾菜', buffetSub: 'main', portion: '1隻', calories: 235, proteinG: 21, carbsG: 3, fatG: 15 },
  { id: 'tw-bfet-m2', name: '滷大雞腿（L型全腿）', group: '自助餐夾菜', buffetSub: 'main', portion: '1大隻', calories: 360, proteinG: 31, carbsG: 5, fatG: 24 },
  { id: 'tw-bfet-m3', name: '香烤／照燒無骨雞腿排', group: '自助餐夾菜', buffetSub: 'main', portion: '1片', calories: 275, proteinG: 24, carbsG: 6, fatG: 17 },
  { id: 'tw-bfet-m4', name: '酥炸雞腿排／炸雞排', group: '自助餐夾菜', buffetSub: 'main', portion: '1片', calories: 390, proteinG: 24, carbsG: 18, fatG: 25 },
  { id: 'tw-bfet-m5', name: '白斬雞／蔥油雞肉塊', group: '自助餐夾菜', buffetSub: 'main', portion: '1份 90g', calories: 165, proteinG: 22, carbsG: 1, fatG: 8 },
  { id: 'tw-bfet-m6', name: '滷排骨（先炸後滷）', group: '自助餐夾菜', buffetSub: 'main', portion: '1片', calories: 285, proteinG: 20, carbsG: 9, fatG: 19 },
  { id: 'tw-bfet-m7', name: '古早味炸排骨', group: '自助餐夾菜', buffetSub: 'main', portion: '1片', calories: 335, proteinG: 20, carbsG: 14, fatG: 22 },
  { id: 'tw-bfet-m8', name: '蒜泥白肉（五花肉片）', group: '自助餐夾菜', buffetSub: 'main', portion: '1份 85g', calories: 245, proteinG: 13, carbsG: 3, fatG: 20 },
  { id: 'tw-bfet-m9', name: '蔥爆豬肉／洋蔥炒肉絲', group: '自助餐夾菜', buffetSub: 'main', portion: '1格 85g', calories: 175, proteinG: 14, carbsG: 5, fatG: 11 },
  { id: 'tw-bfet-m10', name: '蔥爆牛肉／青椒炒牛肉', group: '自助餐夾菜', buffetSub: 'main', portion: '1格 85g', calories: 185, proteinG: 16, carbsG: 5, fatG: 11.5 },
  { id: 'tw-bfet-m11', name: '宮保雞丁／辣炒雞丁', group: '自助餐夾菜', buffetSub: 'main', portion: '1格 90g', calories: 195, proteinG: 16, carbsG: 7, fatG: 11.5 },
  { id: 'tw-bfet-m12', name: '糖醋里肌／糖醋雞丁', group: '自助餐夾菜', buffetSub: 'main', portion: '1格 90g', calories: 240, proteinG: 13, carbsG: 18, fatG: 13 },
  { id: 'tw-bfet-m13', name: '紅燒獅子頭', group: '自助餐夾菜', buffetSub: 'main', portion: '1大顆', calories: 210, proteinG: 12, carbsG: 6, fatG: 15.5 },
  { id: 'tw-bfet-m14', name: '滷控肉／梅干扣肉', group: '自助餐夾菜', buffetSub: 'main', portion: '1塊 80g', calories: 290, proteinG: 12, carbsG: 4, fatG: 25 },
  { id: 'tw-bfet-m15', name: '乾煎鯖魚', group: '自助餐夾菜', buffetSub: 'main', portion: '半片 90g', calories: 225, proteinG: 19, carbsG: 0.5, fatG: 16 },
  { id: 'tw-bfet-m16', name: '清蒸鱈魚／破布子蒸魚', group: '自助餐夾菜', buffetSub: 'main', portion: '1片 100g', calories: 135, proteinG: 19, carbsG: 2, fatG: 5.5 },
  { id: 'tw-bfet-m17', name: '香煎鮭魚／烤鮭魚', group: '自助餐夾菜', buffetSub: 'main', portion: '1片 90g', calories: 215, proteinG: 19, carbsG: 0.5, fatG: 15 },

  // 3. 蛋料理＆豆腐豆製品副菜 (egg_tofu)
  { id: 'tw-bfet-e1', name: '番茄炒蛋', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 85g', calories: 130, proteinG: 6.5, carbsG: 6.5, fatG: 9 },
  { id: 'tw-bfet-e2', name: '蔥花蛋／九層塔煎蛋', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 75g', calories: 145, proteinG: 7.5, carbsG: 2, fatG: 12 },
  { id: 'tw-bfet-e3', name: '菜脯蛋／玉米炒蛋', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 75g', calories: 140, proteinG: 7, carbsG: 5, fatG: 10.5 },
  { id: 'tw-bfet-e4', name: '滑嫩蒸蛋／茶碗蒸', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格/1碗', calories: 80, proteinG: 7, carbsG: 2, fatG: 5 },
  { id: 'tw-bfet-e5', name: '荷包蛋（半熟／全熟煎蛋）', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1顆', calories: 115, proteinG: 7, carbsG: 0.8, fatG: 9.2 },
  { id: 'tw-bfet-e6', name: '麻婆豆腐（微辣勾芡）', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 100g', calories: 145, proteinG: 9, carbsG: 6, fatG: 9.5 },
  { id: 'tw-bfet-e7', name: '紅燒板豆腐／家常煎豆腐', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 85g', calories: 125, proteinG: 8.5, carbsG: 4, fatG: 8.5 },
  { id: 'tw-bfet-e8', name: '芹菜炒豆干／小魚乾豆干', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 75g', calories: 130, proteinG: 10, carbsG: 4, fatG: 8.5 },
  { id: 'tw-bfet-e9', name: '滷豆干＋海帶結', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 80g', calories: 105, proteinG: 8.5, carbsG: 5, fatG: 5.5 },
  { id: 'tw-bfet-e10', name: '芹菜炒豆包／紅燒豆皮', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 75g', calories: 145, proteinG: 11, carbsG: 4, fatG: 9.5 },
  { id: 'tw-bfet-e11', name: '涼拌干絲／毛豆仁', group: '自助餐夾菜', buffetSub: 'egg_tofu', portion: '1格 75g', calories: 110, proteinG: 9, carbsG: 5, fatG: 6 },

  // 4. 青菜＆常見自助餐配菜 (veggie)
  { id: 'tw-bfet-v1', name: '清炒高麗菜', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 65, proteinG: 1.3, carbsG: 5, fatG: 4.5 },
  { id: 'tw-bfet-v2', name: '蒜炒地瓜葉', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 70, proteinG: 2.4, carbsG: 4.5, fatG: 5 },
  { id: 'tw-bfet-v3', name: '清炒空心菜／菠菜／A菜', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 65, proteinG: 2, carbsG: 4, fatG: 4.8 },
  { id: 'tw-bfet-v4', name: '清炒青江菜／小白菜／油菜', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 60, proteinG: 1.6, carbsG: 3.5, fatG: 4.5 },
  { id: 'tw-bfet-v5', name: '蒜炒綠花椰菜／白花椰菜', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 60, proteinG: 2.8, carbsG: 5, fatG: 3.5 },
  { id: 'tw-bfet-v6', name: '木耳炒紅蘿蔔／高麗菜', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 60, proteinG: 1.2, carbsG: 5.5, fatG: 3.8 },
  { id: 'tw-bfet-v7', name: '清炒豆芽菜／韭菜豆芽', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 55, proteinG: 2.2, carbsG: 4, fatG: 3.5 },
  { id: 'tw-bfet-v8', name: '薑絲炒絲瓜／蛤蜊絲瓜', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 85g', calories: 55, proteinG: 1.5, carbsG: 5, fatG: 3.2 },
  { id: 'tw-bfet-v9', name: '滷白菜／扁魚白菜滷', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 90g', calories: 85, proteinG: 2.5, carbsG: 6, fatG: 5.8 },
  { id: 'tw-bfet-v10', name: '滷筍絲／悶桂竹筍', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 65, proteinG: 2, carbsG: 4.5, fatG: 4.5 },
  { id: 'tw-bfet-v11', name: '清炒玉米筍／四季豆／甜豆', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 75g', calories: 65, proteinG: 2, carbsG: 6, fatG: 3.8 },
  { id: 'tw-bfet-v12', name: '炒玉米粒／火腿玉米／三色豆', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 105, proteinG: 3, carbsG: 15, fatG: 4 },
  { id: 'tw-bfet-v13', name: '塔香炒茄子／魚香茄子（吸油）', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 135, proteinG: 1.5, carbsG: 7, fatG: 11.5 },
  { id: 'tw-bfet-v14', name: '苦瓜炒鹹蛋', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 80g', calories: 115, proteinG: 4, carbsG: 4.5, fatG: 9 },
  { id: 'tw-bfet-v15', name: '螞蟻上樹／肉末炒冬粉', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 90g', calories: 150, proteinG: 3.5, carbsG: 21, fatG: 6 },
  { id: 'tw-bfet-v16', name: '洋蔥炒甜不辣／貢丸切片', group: '自助餐夾菜', buffetSub: 'veggie', portion: '1格 75g', calories: 165, proteinG: 6.5, carbsG: 18, fatG: 7.5 },

  // === 原有精選分類（100% 完整保留） ===
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
