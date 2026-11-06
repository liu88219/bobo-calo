import { MealFoodItem, MealCategory } from '../types/tracker';
import { pickMealPraise } from '../data/praiseMessages';

export interface ProcessedMealImages {
  apiBase64: string;
  mimeType: string;
  localPreviewUrl: string;
  cloudThumbUrl: string;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('無法讀取照片格式，請換一張照片或改用相簿截圖試試喔'));
    };
    img.src = url;
  });
}

function resizeContain(img: HTMLImageElement, maxDim: number, quality: number): string {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 初始化失敗');
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function resizeSquareThumb(img: HTMLImageElement, size: number, quality: number): string {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const minSide = Math.min(srcW, srcH);
  const sx = Math.floor((srcW - minSide) / 2);
  const sy = Math.floor((srcH - minSide) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 初始化失敗');
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function processMealPhotoFile(file: File): Promise<ProcessedMealImages> {
  const img = await loadImageElement(file);
  const apiDataUrl = resizeContain(img, 896, 0.78);
  const localPreviewUrl = resizeContain(img, 420, 0.8);
  const cloudThumbUrl = resizeSquareThumb(img, 112, 0.56);
  const commaIdx = apiDataUrl.indexOf(',');
  return {
    apiBase64: commaIdx >= 0 ? apiDataUrl.slice(commaIdx + 1) : apiDataUrl,
    mimeType: 'image/jpeg',
    localPreviewUrl,
    cloudThumbUrl,
  };
}

export interface GeminiMealAnalysis {
  title: string;
  items: MealFoodItem[];
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  praise: string;
}

const MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-2.0-flash'];

export function parseGeminiNutritionJson(
  rawText: string,
  category: MealCategory
): GeminiMealAnalysis {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const data = JSON.parse(cleaned) as {
    title?: string;
    items?: Array<{
      name?: string;
      portion?: string;
      calories?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    }>;
    praise?: string;
  };

  const items: MealFoodItem[] = (Array.isArray(data.items) ? data.items : []).map((it, idx) => ({
    id: `ai-item-${Date.now()}-${idx}`,
    name: String(it.name || '美味餐點').trim(),
    portion: String(it.portion || '1份').trim(),
    calories: Math.max(1, Math.round(Number(it.calories) || 100)),
    proteinG: Math.max(0, Math.round((Number(it.proteinG) || 0) * 10) / 10),
    carbsG: Math.max(0, Math.round((Number(it.carbsG) || 0) * 10) / 10),
    fatG: Math.max(0, Math.round((Number(it.fatG) || 0) * 10) / 10),
  }));

  if (items.length === 0) {
    throw new Error('AI 未辨識出具體食物項目，請補充一點文字說明再試試喔');
  }

  const totalCalories = items.reduce((sum, i) => sum + i.calories, 0);
  const proteinG = Math.round(items.reduce((sum, i) => sum + i.proteinG, 0) * 10) / 10;
  const carbsG = Math.round(items.reduce((sum, i) => sum + i.carbsG, 0) * 10) / 10;
  const fatG = Math.round(items.reduce((sum, i) => sum + i.fatG, 0) * 10) / 10;

  return {
    title: String(data.title || items.map((i) => i.name).join('＋')).trim(),
    items,
    totalCalories,
    proteinG,
    carbsG,
    fatG,
    praise: String(data.praise || '').trim() || pickMealPraise(category, totalCalories),
  };
}

export async function analyzeMealWithGemini(params: {
  apiKey: string;
  category: MealCategory;
  descriptionText?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<GeminiMealAnalysis> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) {
    throw new Error('請先到右上角「⚙️ 設定」貼上免費的 Gemini API Key 才能啟動拍照／AI 算熱量喔！');
  }

  const systemPrompt = `你是台灣最溫柔療癒的營養師夥伴「微笑矮袋鼠 Quokka 與軟綿綿小熊 Bobo」。
請根據使用者提供的餐點照片與/或文字描述（以台灣常見飲食份量、便當配菜、手搖飲糖度冰塊習慣為準），拆解這餐包含的食物項目並估算熱量（kcal）與三大營養素（蛋白質 proteinG、碳水 carbsG、脂肪 fatG，單位公克）。
若使用者在備註提到「飯吃一半」、「去皮」、「無糖/微糖」，請務必反映在份量與熱量中！

請嚴格只回傳 JSON 物件（不要加 Markdown 語法），格式如下：
{
  "title": "簡短可愛的餐點總稱（繁體中文，例如：香煎雞腿便當＋無糖綠茶）",
  "items": [
    { "name": "食物名稱", "portion": "估算份量（如 半碗 / 1塊約120g）", "calories": 280, "proteinG": 24, "carbsG": 8, "fatG": 15 }
  ],
  "praise": "用超溫柔療癒誇誇風（約 35~65 字，繁體中文，帶一點 🤎✨🍡 等可愛表情）稱讚使用者好好吃飯照顧自己、誇獎這餐裡的營養亮點或帶來的快樂能量，絕對禁止說教、禁止製造罪惡感！"
}`;

  const parts: Array<Record<string, unknown>> = [{ text: systemPrompt }];
  if (params.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: params.imageMimeType || 'image/jpeg',
        data: params.imageBase64,
      },
    });
  }
  const userHint = params.descriptionText?.trim()
    ? `使用者補充說明：「${params.descriptionText.trim()}」`
    : '請辨識照片中的餐點並估算熱量。';
  parts.push({ text: userHint });

  let lastErr = '連線失敗';

  for (const model of MODELS_TO_TRY) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        if (res.status === 400 || res.status === 403) {
          throw new Error('API Key 驗證失敗或格式有誤，請檢查「⚙️ 設定」中的 Gemini API Key 喔');
        }
        lastErr = `模型 ${model} 暫時忙碌 (${res.status}) ${errBody.slice(0, 60)}`;
        continue;
      }

      const json = await res.json();
      const rawText: string =
        json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
        '';
      if (!rawText) {
        lastErr = 'AI 回傳內容為空';
        continue;
      }
      return parseGeminiNutritionJson(rawText, params.category);
    } catch (e) {
      if (e instanceof Error && e.message.includes('API Key 驗證失敗')) {
        throw e;
      }
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(`AI 估算暫時無法連線：${lastErr}`);
}

export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  const clean = apiKey.trim();
  if (!clean) return false;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(clean)}`;
  const res = await fetch(endpoint);
  return res.ok;
}
