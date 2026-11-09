import { MealFoodItem, MealCategory } from '../types/tracker';
import { pickMealPraise } from '../data/praiseMessages';

export interface ProcessedMealImages {
  apiBase64: string;
  mimeType: string;
  localPreviewUrl: string;
  cloudThumbUrl: string;
}

type DrawableSource = HTMLImageElement | ImageBitmap;

function getSourceDimensions(src: DrawableSource): { w: number; h: number } {
  if ('naturalWidth' in src) {
    return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height };
  }
  return { w: src.width, h: src.height };
}

async function loadImageSource(file: File): Promise<DrawableSource> {
  const isHeic =
    /\.(heic|heif)$/i.test(file.name || '') ||
    /image\/(heic|heif)/i.test(file.type || '');

  // Try standard HTMLImageElement first (works natively for JPEG/PNG/WebP, and HEIC on iOS Safari)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => {
        URL.revokeObjectURL(url);
        resolve(el);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('img_decode_failed'));
      };
      el.src = url;
    });
    return img;
  } catch {
    // Fallback to createImageBitmap if supported by browser
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file);
      } catch {
        // Fall through to descriptive error below
      }
    }
    if (isHeic) {
      throw new Error(
        '這張照片是 iPhone HEIC 原況格式，目前瀏覽器無法直接解碼～建議在 iPhone「設定 > 相機 > 格式」選「最相容」，或先截圖再上傳就能秒讀囉 📸'
      );
    }
    throw new Error('無法讀取這張照片格式，請換一張照片或改用相簿截圖試試喔 📸');
  }
}

function resizeContain(src: DrawableSource, maxDim: number, quality: number): string {
  const dims = getSourceDimensions(src);
  let w = dims.w;
  let h = dims.h;
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
  ctx.drawImage(src as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function resizeSquareThumb(src: DrawableSource, size: number, quality: number): string {
  const { w: srcW, h: srcH } = getSourceDimensions(src);
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
  ctx.drawImage(src as CanvasImageSource, sx, sy, minSide, minSide, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * 將照片壓縮至 1280px 高清解析度（保留商品背面「營養標示／成分表」細小中文字清晰度！），同時產生本機預覽與雲端縮圖
 */
export async function processMealPhotoFile(file: File): Promise<ProcessedMealImages> {
  const src = await loadImageSource(file);
  try {
    const apiDataUrl = resizeContain(src, 1280, 0.86);
    const localPreviewUrl = resizeContain(src, 520, 0.82);
    const cloudThumbUrl = resizeSquareThumb(src, 112, 0.56);
    const commaIdx = apiDataUrl.indexOf(',');
    return {
      apiBase64: commaIdx >= 0 ? apiDataUrl.slice(commaIdx + 1) : apiDataUrl,
      mimeType: 'image/jpeg',
      localPreviewUrl,
      cloudThumbUrl,
    };
  } finally {
    if ('close' in src && typeof src.close === 'function') {
      src.close();
    }
  }
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
  // Extract JSON object even if model wrapped extra prose or markdown fences around it
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
    throw new Error('AI 未辨識出具體食物項目，請補充一點商品名或食物說明再試試喔 🤎');
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

/**
 * 解析台灣商品包裝背面「營養標示 (Nutrition Facts)」與「品名／成分」OCR 文字（純前端零伺服器配額保底解析器！）
 */
export function parseTaiwanNutritionLabelText(
  ocrRaw: string,
  userHint: string | undefined,
  category: MealCategory
): GeminiMealAnalysis | null {
  const normalized = ocrRaw
    .replace(/[：:]/g, ':')
    .replace(/\u3000/g, ' ')
    .replace(/,/g, '');

  // Look for calories ("熱量 193 大卡" / "熱量 193 kcal" / "Energy 193 kcal")
  const kcalMatch =
    /熱\s*量[^\d\n]{0,12}(\d+(?:\.\d+)?)\s*(?:大卡|kcal|卡)/i.exec(normalized) ||
    /calories?[^\d\n]{0,12}(\d+(?:\.\d+)?)/i.exec(normalized);
  if (!kcalMatch) return null;

  const perServingKcal = Number(kcalMatch[1]);
  if (!Number.isFinite(perServingKcal) || perServingKcal <= 0) return null;

  const proteinMatch = /蛋\s*白\s*質[^\d\n]{0,12}(\d+(?:\.\d+)?)\s*(?:公克|g)/i.exec(normalized);
  const fatMatch = /(?:^|[^飽和反式])脂\s*肪[^\d\n]{0,12}(\d+(?:\.\d+)?)\s*(?:公克|g)/im.exec(
    normalized
  );
  const carbsMatch = /碳\s*水\s*化\s*合\s*物[^\d\n]{0,12}(\d+(?:\.\d+)?)\s*(?:公克|g)/i.exec(
    normalized
  );

  const servingSizeMatch = /每\s*一?\s*份\s*量[^\d\n]{0,8}(\d+(?:\.\d+)?\s*(?:公克|毫升|g|ml))/i.exec(
    normalized
  );
  const servingsCountMatch = /本\s*包\s*裝\s*含[^\d\n]{0,8}(\d+(?:\.\d+)?)\s*份/i.exec(normalized);

  const servingsPerPack = servingsCountMatch ? Number(servingsCountMatch[1]) : 1;
  const servingUnitText = servingSizeMatch ? servingSizeMatch[1].replace(/\s+/g, '') : '';
  const isSingleBottleDrink =
    /毫升|ml/i.test(servingUnitText) && servingsPerPack > 1 && servingsPerPack <= 2.5;

  const multiplier = isSingleBottleDrink ? servingsPerPack : 1;

  // Infer product name from userHint -> 品名 -> 成分 -> fallback
  const cleanHint = (userHint || '').trim();
  const productNameMatch = /品\s*名\s*:\s*([^\n\r]{2,24})/.exec(normalized);
  const ingredientsMatch = /成\s*[分份](?:與?原?料?)?\s*:\s*([^\n\r]{2,28})/.exec(normalized);

  let inferredName = cleanHint;
  if (!inferredName && productNameMatch) {
    inferredName = productNameMatch[1].trim();
  }
  if (!inferredName && ingredientsMatch) {
    const topIngs = ingredientsMatch[1]
      .split(/[、，,（(]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== '水')
      .slice(0, 2)
      .join('');
    if (topIngs) {
      inferredName = `包裝${topIngs}食品（營養標示直讀）`;
    }
  }
  if (!inferredName) {
    inferredName = '包裝食品／飲品（營養標示直讀）';
  }

  let portionDesc = '1份（依包裝營養標示）';
  if (isSingleBottleDrink) {
    portionDesc = `1整瓶（含${servingsPerPack}份，每份${Math.round(perServingKcal)}大卡）`;
  } else if (servingsPerPack > 1) {
    portionDesc = `1份${servingUnitText ? ` ${servingUnitText}` : ''}（全包共${servingsPerPack}份）`;
  } else if (servingUnitText) {
    portionDesc = `1份 (${servingUnitText}，依營養標示)`;
  }

  const calories = Math.max(1, Math.round(perServingKcal * multiplier));
  const proteinG = Math.round((proteinMatch ? Number(proteinMatch[1]) : 0) * multiplier * 10) / 10;
  const fatG = Math.round((fatMatch ? Number(fatMatch[1]) : 0) * multiplier * 10) / 10;
  const carbsG = Math.round((carbsMatch ? Number(carbsMatch[1]) : 0) * multiplier * 10) / 10;

  const item: MealFoodItem = {
    id: `label-item-${Date.now()}`,
    name: inferredName,
    portion: portionDesc,
    calories,
    proteinG,
    carbsG,
    fatG,
  };

  return {
    title: inferredName,
    items: [item],
    totalCalories: calories,
    proteinG,
    carbsG,
    fatG,
    praise: pickMealPraise(category, calories),
  };
}

function base64ToJpegBlob(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/jpeg' });
}

function createTinyBlankJpegBlob(): Blob {
  // Minimal valid 1x1 white JPEG bytes for text-only fallback on vision-language space
  const b64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  return base64ToJpegBlob(b64);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    return await fetch(url, { ...init, signal: ctrl?.signal });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

class GradioQuotaError extends Error {
  public readonly isQuota: boolean;
  constructor(message: string, isQuota = false) {
    super(message);
    this.isQuota = isQuota;
  }
}

function parseGradioSseOutput(sseText: string): string {
  const lines = sseText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const evt = lines[i].trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    if (evt === 'event: complete' && nextLine.startsWith('data:')) {
      const jsonPart = nextLine.slice(5).trim();
      const arr = JSON.parse(jsonPart);
      if (Array.isArray(arr) && typeof arr[0] === 'string' && arr[0].trim()) {
        return arr[0].trim();
      }
    }
    if (evt === 'event: error') {
      const errRaw = nextLine.startsWith('data:') ? nextLine.slice(5).trim() : '';
      const isQuota = /ZeroGPU|quota|limit/i.test(errRaw);
      throw new GradioQuotaError(
        isQuota
          ? '免費雲端視覺 GPU 今日額度暫滿'
          : `雲端視覺節點忙碌 (${errRaw.slice(0, 60) || 'error'})`,
        isQuota
      );
    }
  }
  throw new GradioQuotaError('未取得視覺模型回應');
}

async function callGradioSpaceVisionOnce(
  baseUrl: string,
  endpoint: string,
  imageBlob: Blob,
  buildPayload: (fileData: Record<string, unknown>) => unknown[]
): Promise<string> {
  const form = new FormData();
  form.append('files', imageBlob, 'meal.jpg');

  const upRes = await fetchWithTimeout(`${baseUrl}/gradio_api/upload`, {
    method: 'POST',
    body: form,
  }, 15000);
  if (!upRes.ok) throw new Error(`Upload ${upRes.status}`);
  const upJson = (await upRes.json()) as string[];
  const remotePath = upJson?.[0];
  if (!remotePath) throw new Error('Missing upload path');

  const fileData = { path: remotePath, meta: { _type: 'gradio.FileData' } };
  const callRes = await fetchWithTimeout(`${baseUrl}/gradio_api/call${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: buildPayload(fileData) }),
  }, 15000);
  if (!callRes.ok) throw new Error(`Call ${callRes.status}`);
  const { event_id: eventId } = (await callRes.json()) as { event_id?: string };
  if (!eventId) throw new Error('Missing event_id');

  const sseRes = await fetchWithTimeout(
    `${baseUrl}/gradio_api/call${endpoint}/${eventId}`,
    { method: 'GET' },
    26000
  );
  if (!sseRes.ok) throw new Error(`SSE ${sseRes.status}`);
  const sseText = await sseRes.text();
  return parseGradioSseOutput(sseText);
}

async function callGradioSpaceVisionWithRetry(
  baseUrl: string,
  endpoint: string,
  imageBlob: Blob,
  buildPayload: (fileData: Record<string, unknown>) => unknown[],
  maxAttempts = 2
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callGradioSpaceVisionOnce(baseUrl, endpoint, imageBlob, buildPayload);
    } catch (err) {
      lastErr = err;
      // Do not waste retries if ZeroGPU explicitly said IP quota exceeded
      if (err instanceof GradioQuotaError && err.isQuota) {
        break;
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1100 * attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('雲端視覺辨識暫時無回應');
}

const NUTRITION_SYSTEM_PROMPT = `你是台灣最溫柔療癒的營養師夥伴「DINOTAENG 短尾矮袋鼠 Quokka 與雪白軟糖小熊 BOBO」。
請根據圖片或文字內容（支援兩種情境：① 實體餐點美食照 ② 商品包裝背面的「營養標示 Nutrition Facts／成分表」），拆解食物項目並計算熱量（kcal）與三大營養素（蛋白質 proteinG、碳水 carbsG、脂肪 fatG，單位公克）。

【重要規則】：
1. 若圖片是「商品包裝背面／營養標示／成分表」：
   - 請逐字精準讀取表格內的「每一份量」、「本包裝含幾份」以及「每份」的熱量（大卡/kcal）、蛋白質、脂肪、碳水化合物數字，100% 以包裝印製數字為準！
   - 為什麼拍商品背面常沒有正面大品牌名？因為背面通常只印小字「品名：...」或「成分：...」！請優先找「品名」；若沒拍到品名，請從「成分表前2~3項原料（例如：水、非基因改造黑豆 -> 微糖黑豆漿；燕麥、杏仁、蔓越莓 -> 堅果蔓越莓燕麥包）」推斷商品內容作為名稱；若整張圖只有純營養標示表格完全沒拍到品名與成分，請命名為「包裝食品／飲品（營養標示精準直讀）」，絕對禁止回答「看不到食物」或回傳空陣列！
   - 若為瓶裝飲料且「本包裝含 2 份」（如 400ml~500ml 豆漿/茶飲）且使用者未特別註明只喝半瓶，可算整瓶（2份）並在 portion 清楚註明「1整瓶 (含2份，每份X大卡)」；若為多份量零食袋（含 3 份以上），預設算「1份 (全包共X份，依營養標示)」。
2. 若圖片是一般餐點（便當、早午餐、小吃、手搖飲）：請以台灣常見份量估算，若備註提到「白飯吃一半」、「去皮少油」、「無糖/微糖」請務必反映在份量與熱量中！

請嚴格只回傳 JSON 物件（不要加 Markdown 語法），格式如下：
{
  "title": "簡短可愛的餐點或商品總稱（繁體中文）",
  "items": [
    { "name": "食物或商品名稱", "portion": "份量說明（如 半碗 / 1份 45g 依營養標示）", "calories": 280, "proteinG": 24, "carbsG": 8, "fatG": 15 }
  ],
  "praise": "用超溫柔療癒誇誇風（約 35~65 字，繁體中文，帶一點 🤎✨🤍 等可愛表情）稱讚使用者好好吃飯照顧自己、誇獎這餐裡的營養亮點或快樂能量，絕對禁止說教、禁止製造罪惡感！"
}`;

/**
 * 當免費雲端 GPU 額度滿載時，於瀏覽器本地按需載入輕量 OCR 讀取包裝背面「營養標示」（零伺服器額度限制！）
 */
async function tryBrowserLocalNutritionLabelOcr(
  imageBase64: string,
  userHint: string | undefined,
  category: MealCategory
): Promise<GeminiMealAnalysis | null> {
  try {
    const cdnUrl = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm';
    const tesseractMod = (await import(/* @vite-ignore */ cdnUrl)) as {
      recognize?: (
        image: string,
        langs: string
      ) => Promise<{ data?: { text?: string } }>;
      default?: {
        recognize?: (
          image: string,
          langs: string
        ) => Promise<{ data?: { text?: string } }>;
      };
    };
    const recognizeFn = tesseractMod.recognize || tesseractMod.default?.recognize;
    if (!recognizeFn) return null;

    const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
    const ocrRes = await recognizeFn(dataUrl, 'chi_tra+eng');
    const text = ocrRes?.data?.text || '';
    if (!text.trim()) return null;
    return parseTaiwanNutritionLabelText(text, userHint, category);
  } catch {
    return null;
  }
}

let lastPollinationsCallAt = 0;

/**
 * 內建免金鑰雲端 AI 結構化營養計算：
 * 自動避開 Pollinations 匿名層「每 45 秒 1 次 (HTTP 402)」頻率限制，無縫雙引擎備援 Qwen2.5-VL！
 */
async function estimateNutritionKeyless(
  mealContext: string,
  category: MealCategory
): Promise<GeminiMealAnalysis> {
  const now = Date.now();
  const pollinationsReady = now - lastPollinationsCallAt >= 46_000;

  const tryPollinations = async (): Promise<GeminiMealAnalysis> => {
    lastPollinationsCallAt = Date.now();
    const res = await fetchWithTimeout(
      'https://text.pollinations.ai/openai',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai-fast',
          temperature: 0.25,
          messages: [
            { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
            { role: 'user', content: mealContext },
          ],
        }),
      },
      18000
    );
    if (!res.ok) {
      throw new Error(`Pollinations HTTP ${res.status}`);
    }
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('Empty Pollinations content');
    return parseGeminiNutritionJson(content, category);
  };

  const tryQwenTextMode = async (): Promise<GeminiMealAnalysis> => {
    const blankBlob = createTinyBlankJpegBlob();
    const fullPrompt = `（請忽略空白底圖，僅依以下文字計算營養素）\n${NUTRITION_SYSTEM_PROMPT}\n\n${mealContext}`;
    const raw = await callGradioSpaceVisionWithRetry(
      'https://developer0hye-qwen2-5-vl-7b-instruct.hf.space',
      '/qwen_vl_inference',
      blankBlob,
      (fd) => [fd, fullPrompt],
      2
    );
    return parseGeminiNutritionJson(raw, category);
  };

  if (pollinationsReady) {
    try {
      return await tryPollinations();
    } catch {
      return await tryQwenTextMode();
    }
  } else {
    try {
      return await tryQwenTextMode();
    } catch {
      // Wait briefly or try Pollinations as backup
      return await tryPollinations();
    }
  }
}

/**
 * 一步到位免金鑰照片分析（同時支援「美食實體照」與「商品背面營養標示／成分表 OCR 直讀」！）
 * 直接由 Qwen2.5-VL 輸出完整 JSON，省去第二階段 Pollinations 45 秒冷卻限制，速度更快、成功率大幅提升！
 */
async function analyzePhotoKeylessDirect(params: {
  imageBase64: string;
  descriptionText?: string;
  category: MealCategory;
}): Promise<GeminiMealAnalysis> {
  const blob = base64ToJpegBlob(params.imageBase64);
  const userNote = params.descriptionText?.trim()
    ? `\n【使用者補充商品名或備註（請優先採用！）】：「${params.descriptionText.trim()}」`
    : '';

  const oneShotPrompt = `${NUTRITION_SYSTEM_PROMPT}${userNote}\n請仔細觀察這張圖片（若圖片中有「營養標示」或「成分」表格，請務必精準直讀上面的熱量與營養素數字並從品名/成分推斷商品名稱），並只回傳上述 JSON 物件！`;

  try {
    const raw = await callGradioSpaceVisionWithRetry(
      'https://developer0hye-qwen2-5-vl-7b-instruct.hf.space',
      '/qwen_vl_inference',
      blob,
      (fd) => [fd, oneShotPrompt],
      2
    );
    return parseGeminiNutritionJson(raw, params.category);
  } catch (visionErr) {
    // 保底通道 1：若拍的是包裝背面「營養標示」，即使雲端視覺 GPU 額度滿了，也能用瀏覽器本地 OCR 直接讀出熱量與營養素！
    const localLabelResult = await tryBrowserLocalNutritionLabelOcr(
      params.imageBase64,
      params.descriptionText,
      params.category
    );
    if (localLabelResult) {
      return localLabelResult;
    }

    // 保底通道 2：若使用者同時有打文字說明（如「無糖豆漿」或「雞腿便當」），直接用文字引擎算出結果不報錯！
    if (params.descriptionText?.trim()) {
      return estimateNutritionKeyless(
        `【使用者餐點描述】：「${params.descriptionText.trim()}」`,
        params.category
      );
    }

    // 保底通道 3：嘗試備援英文視覺節點 Florence-2 再轉營養估算
    try {
      const caption = await callGradioSpaceVisionOnce(
        'https://prithivmlmods-florence-2-image-caption.hf.space',
        '/describe_image',
        blob,
        (fd) => [fd, 'Florence-2-base']
      );
      if (caption) {
        return await estimateNutritionKeyless(
          `【AI 照片辨識結果】：${caption}`,
          params.category
        );
      }
    } catch {
      // Fall through to clear user-facing explanation
    }

    if (visionErr instanceof GradioQuotaError && visionErr.isQuota) {
      throw new Error(
        '免費雲端視覺 GPU 在目前網路 IP 的今日額度剛好用完囉 🥺 妳可以：① 在上方文字欄順手輸入吃了什麼（免看圖秒算！）、② 切換手機 4G/5G 與 Wi-Fi，或 ③ 點右上角 ⚙️ 貼入免費 Gemini API Key 享每日 1,500 張無限拍！'
      );
    }

    throw new Error(
      '剛剛雲端拍照伺服器小塞車了一下 🥺 請再點一次按鈕重試，或在上方文字欄補充一句食物名稱（若是拍包裝背面，請盡量對焦在「營養標示」方框喔）！'
    );
  }
}

/**
 * 主入口：若使用者有自備 Gemini API Key 則優先走 Gemini；否則自動使用「內建免金鑰高清視覺＋營養標示 OCR 引擎」開箱即用！
 */
export async function analyzeMealWithGemini(params: {
  apiKey?: string;
  category: MealCategory;
  descriptionText?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<GeminiMealAnalysis> {
  const cleanKey = (params.apiKey || '').trim();

  // Path A: 使用者有選填自己的 Gemini API Key（支援高清餐點照 + 商品背面營養標示直讀，無 ZeroGPU 限制）
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
        : '請辨識照片中的餐點（或包裝背面的營養標示與品名／成分）並精準計算熱量與三大營養素。',
    });

    for (const model of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const res = await fetchWithTimeout(
          endpoint,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              generationConfig: {
                temperature: 0.25,
                responseMimeType: 'application/json',
              },
            }),
          },
          22000
        );
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

  // Path B1: 有附照片 -> 走一步到位高清視覺＋營養標示 OCR 引擎（免經 Pollinations 45 秒限制！）
  if (params.imageBase64) {
    return analyzePhotoKeylessDirect({
      imageBase64: params.imageBase64,
      descriptionText: params.descriptionText,
      category: params.category,
    });
  }

  // Path B2: 純文字描述 -> 走雙引擎免金鑰營養估算
  const cleanText = (params.descriptionText || '').trim();
  if (!cleanText) {
    throw new Error('請先拍一張美食／營養標示照片，或輸入吃了什麼喔 🍱');
  }

  return estimateNutritionKeyless(`【使用者餐點描述／備註】：${cleanText}`, params.category);
}

/**
 * 當照片 AI 辨識有誤時，讓使用者直接修改菜色名稱／份量／新增漏掉項目或補充修正說明，再重新精準計算卡路里與三大營養素！
 * （不重跑視覺猜測，避免 AI 又把使用者改對的菜名改回錯的，且內建雙引擎防 45 秒冷卻！）
 */
export async function recalculateMealFromEdits(params: {
  apiKey?: string;
  category: MealCategory;
  editedItems: Array<{ name: string; portion: string }>;
  correctionNote?: string;
}): Promise<GeminiMealAnalysis> {
  const validItems = params.editedItems
    .map((x) => ({
      name: x.name.trim(),
      portion: x.portion.trim() || '1份',
    }))
    .filter((x) => x.name.length > 0);

  if (validItems.length === 0 && !params.correctionNote?.trim()) {
    throw new Error('請至少保留一樣食物名稱，或填寫修正內容再重新計算喔 🤎');
  }

  const listLines = validItems
    .map((it, idx) => `${idx + 1}. 食物名稱：${it.name}｜實際份量：${it.portion}`)
    .join('\n');

  const recalcPrompt = [
    '使用者已手動修正這餐「真正正確的食物清單與份量」，請以此為 100% 事實基準重新精算每一項的卡路里與營養素：',
    listLines ? `【修正後的正確清單】：\n${listLines}` : '',
    params.correctionNote?.trim()
      ? `【使用者額外修正指示（請優先套用）】：${params.correctionNote.trim()}`
      : '',
    '請保留使用者修正後的正確食物名稱與份量（若額外修正指示有要求調整則依指示更新），重新估算每一項對應的 calories、proteinG、carbsG、fatG，並回傳相同 JSON 格式！',
  ]
    .filter(Boolean)
    .join('\n\n');

  const cleanKey = (params.apiKey || '').trim();
  if (cleanKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const res = await fetchWithTimeout(
          endpoint,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${NUTRITION_SYSTEM_PROMPT}\n\n${recalcPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
          },
          20000
        );
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
        // Fallback to built-in keyless engine
      }
    }
  }

  return estimateNutritionKeyless(recalcPrompt, params.category);
}

export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  const clean = apiKey.trim();
  if (!clean) return false;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(clean)}`;
  const res = await fetch(endpoint);
  return res.ok;
}
