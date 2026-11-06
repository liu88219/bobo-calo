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
  const apiDataUrl = resizeContain(img, 768, 0.78);
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

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

export function parseGeminiNutritionJson(
  rawText: string,
  category: MealCategory
): GeminiMealAnalysis {
  // Extract JSON object even if model wrapped extra prose around it
  const trimmed = rawText.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  const jsonSlice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? trimmed.slice(firstBrace, lastBrace + 1)
      : trimmed
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

  const data = JSON.parse(jsonSlice) as {
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
  const carbsG = Math.round(items.reduce((sum, i) => s_add(sum, i.carbsG), 0) * 10) / 10;
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

function s_add(a: number, b: number): number {
  return a + (Number.isFinite(b) ? b : 0);
}

function base64ToJpegBlob(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/jpeg' });
}

function parseGradioCompleteEvent(sseText: string): string {
  const lines = sseText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'event: complete' && i + 1 < lines.length) {
      const dataLine = lines[i + 1].trim();
      if (dataLine.startsWith('data:')) {
        const jsonPart = dataLine.slice(5).trim();
        const arr = JSON.parse(jsonPart);
        if (Array.isArray(arr) && typeof arr[0] === 'string') {
          return arr[0].trim();
        }
      }
    }
  }
  throw new Error('未取得視覺模型回應');
}

async function callGradioSpaceVision(
  baseUrl: string,
  endpoint: string,
  imageBlob: Blob,
  buildPayload: (fileData: Record<string, unknown>) => unknown[]
): Promise<string> {
  const form = new FormData();
  form.append('files', imageBlob, 'meal.jpg');

  const upRes = await fetch(`${baseUrl}/gradio_api/upload`, {
    method: 'POST',
    body: form,
  });
  if (!upRes.ok) throw new Error(`Upload ${upRes.status}`);
  const upJson = (await upRes.json()) as string[];
  const remotePath = upJson?.[0];
  if (!remotePath) throw new Error('Missing upload path');

  const fileData = { path: remotePath, meta: { _type: 'gradio.FileData' } };
  const callRes = await fetch(`${baseUrl}/gradio_api/call${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: buildPayload(fileData) }),
  });
  if (!callRes.ok) throw new Error(`Call ${callRes.status}`);
  const { event_id: eventId } = (await callRes.json()) as { event_id?: string };
  if (!eventId) throw new Error('Missing event_id');

  const sseRes = await fetch(`${baseUrl}/gradio_api/call${endpoint}/${eventId}`);
  if (!sseRes.ok) throw new Error(`SSE ${sseRes.status}`);
  const sseText = await sseRes.text();
  return parseGradioCompleteEvent(sseText);
}

/**
 * 內建免金鑰雲端視覺辨識（自動串聯 Qwen2.5-VL 與 Florence-2 雙備援節點）
 */
async function recognizeMealPhotoKeyless(
  imageBase64: string,
  userHint?: string
): Promise<string> {
  const blob = base64ToJpegBlob(imageBase64);

  // Node 1: Qwen2.5-VL-7B-Instruct (支援繁體中文與台灣菜色精準辨識)
  try {
    const prompt = `請仔細觀察這張餐點照片${
      userHint?.trim() ? `（使用者補充：${userHint.trim()}）` : ''
    }，用繁體中文列出照片中所有看得到的食物名稱、配菜、飲料與大約份量。`;
    const desc = await callGradioSpaceVision(
      'https://developer0hye-qwen2-5-vl-7b-instruct.hf.space',
      '/qwen_vl_inference',
      blob,
      (fd) => [fd, prompt]
    );
    if (desc) return desc;
  } catch {
    // Fallback to Node 2
  }

  // Node 2: Florence-2 Image Captioning Backup
  const caption = await callGradioSpaceVision(
    'https://prithivmlmods-florence-2-image-caption.hf.space',
    '/describe_image',
    blob,
    (fd) => [fd, 'Florence-2-base']
  );
  return caption;
}

const NUTRITION_SYSTEM_PROMPT = `你是台灣最溫柔療癒的營養師夥伴「DINOTAENG 短尾矮袋鼠 Quokka 與雪白軟糖小熊 BOBO」。
請根據餐點內容（以台灣常見飲食份量、便當配菜、早餐店、超商、手搖飲糖度習慣為準），拆解這餐包含的食物項目並估算熱量（kcal）與三大營養素（蛋白質 proteinG、碳水 carbsG、脂肪 fatG，單位公克）。
若備註提到「白飯吃一半」、「去皮少油」、「無糖/微糖」，請務必反映在份量與熱量中！

請嚴格只回傳 JSON 物件（不要加 Markdown 語法），格式如下：
{
  "title": "簡短可愛的餐點總稱（繁體中文，例如：香煎雞腿便當＋無糖綠茶）",
  "items": [
    { "name": "食物名稱", "portion": "估算份量（如 半碗 / 1份）", "calories": 280, "proteinG": 24, "carbsG": 8, "fatG": 15 }
  ],
  "praise": "用超溫柔療癒誇誇風（約 35~65 字，繁體中文，帶一點 🤎✨🤍 等可愛表情）稱讚使用者好好吃飯照顧自己、誇獎這餐裡的營養亮點或快樂能量，絕對禁止說教、禁止製造罪惡感！"
}`;

/**
 * 內建免金鑰雲端 AI 結構化營養計算 (Pollinations OpenAI-compatible anonymous tier)
 */
async function estimateNutritionKeyless(
  mealContext: string,
  category: MealCategory
): Promise<GeminiMealAnalysis> {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai-fast',
      temperature: 0.3,
      messages: [
        { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
        { role: 'user', content: mealContext },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`免金鑰 AI 伺服器暫時忙碌 (${res.status})，請再點一次試試喔`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content || '';
  if (!content) {
    throw new Error('AI 未回傳估算結果，請再試一次喔');
  }
  return parseGeminiNutritionJson(content, category);
}

/**
 * 主入口：若使用者有自備 Gemini API Key 則優先走 Gemini；否則自動使用「內建免金鑰雲端視覺＋語意 AI 引擎」開箱即用！
 */
export async function analyzeMealWithGemini(params: {
  apiKey?: string;
  category: MealCategory;
  descriptionText?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<GeminiMealAnalysis> {
  const cleanKey = (params.apiKey || '').trim();

  // Path A: 使用者有選填自己的 Gemini API Key
  if (cleanKey) {
    const parts: Array<Record<string, unknown>> = [{ text: NUTRITION_SYSTEM_PROMPT }];
    if (params.imageBase64) {
      parts.push({
        inline_data: {
          mime_type: params.imageMimeType || 'image/jpeg',
          data: params.imageBase64,
        },
      });
    }
    parts.push({
      text: params.descriptionText?.trim()
        ? `使用者補充說明：「${params.descriptionText.trim()}」`
        : '請辨識照片中的餐點並估算熱量。',
    });

    for (const model of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
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
        if (!res.ok) continue;
        const json = await res.json();
        const rawText: string =
          json?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || '')
            .join('') || '';
        if (rawText) {
          return parseGeminiNutritionJson(rawText, params.category);
        }
      } catch {
        // Fallback to built-in keyless engine!
      }
    }
  }

  // Path B: 預設內建免金鑰雙階段 AI 引擎（拍照視覺辨識 + 台灣營養估算，完全免設定 API Key！）
  let visualSummary = '';
  if (params.imageBase64) {
    visualSummary = await recognizeMealPhotoKeyless(params.imageBase64, params.descriptionText);
  }

  const combinedPrompt = [
    visualSummary ? `【AI 照片辨識結果】：${visualSummary}` : '',
    params.descriptionText?.trim()
      ? `【使用者餐點描述／備註】：${params.descriptionText.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (!combinedPrompt) {
    throw new Error('請先拍一張美食照片，或輸入吃了什麼喔 🍱');
  }

  return estimateNutritionKeyless(combinedPrompt, params.category);
}

export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  const clean = apiKey.trim();
  if (!clean) return false;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(clean)}`;
  const res = await fetch(endpoint);
  return res.ok;
}
