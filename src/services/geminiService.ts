import { MealFoodItem, MealCategory } from '../types/tracker';
import { pickMealPraise } from '../data/praiseMessages';
import {
  estimateMealLocallyInstant,
  tryRecalculateItemsLocally,
} from './localFoodEstimator';

export interface ProcessedMealImages {
  apiBase64: string;
  /** 輕量 680px 餐盤照：減少約 65% 上傳流量與 AI 視覺 Token，辨識速度更快！ */
  fastApiBase64?: string;
  mimeType: string;
  localPreviewUrl: string;
  cloudThumbUrl: string;
}

export type PhotoQualityMode = 'fast' | 'hd';

export type AnalysisSource =
  | 'gemini'
  | 'keyless-vision'
  | 'keyless-text'
  | 'local-instant'
  | 'local-ocr'
  | 'cache';

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
 * 同時產生「極速 680px 餐盤照」（上傳體積減少 ~65%、辨識更快）與「1280px 高清照」（營養標示細字專用），
 * 以及本機預覽圖與雲端縮圖
 */
export async function processMealPhotoFile(file: File): Promise<ProcessedMealImages> {
  const src = await loadImageSource(file);
  try {
    const apiDataUrl = resizeContain(src, 1280, 0.86);
    const fastDataUrl = resizeContain(src, 680, 0.76);
    const localPreviewUrl = resizeContain(src, 520, 0.82);
    const cloudThumbUrl = resizeSquareThumb(src, 112, 0.56);
    const commaIdx = apiDataUrl.indexOf(',');
    const fastCommaIdx = fastDataUrl.indexOf(',');
    return {
      apiBase64: commaIdx >= 0 ? apiDataUrl.slice(commaIdx + 1) : apiDataUrl,
      fastApiBase64: fastCommaIdx >= 0 ? fastDataUrl.slice(fastCommaIdx + 1) : fastDataUrl,
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
  source?: AnalysisSource;
  elapsedMs?: number;
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

/** 自動判斷備註是否偏向「商品背面營養標示（細小文字）」需要 1280px 高清模式 */
export function isNutritionLabelHint(descriptionText?: string): boolean {
  const text = (descriptionText || '').trim();
  if (!text) return false;
  return /營養標示|成分表|成分|熱量表|包裝背面|背面|標示|全包|整包|整瓶/i.test(text);
}

function makeFastFingerprint(s: string): string {
  const len = s.length;
  if (len <= 64) return `${len}:${s}`;
  return `${len}:${s.slice(0, 24)}:${s.slice(Math.floor(len / 2), Math.floor(len / 2) + 24)}:${s.slice(-24)}`;
}

// 8-minute cache for pre-uploaded Gradio image paths (saves 0.7s~2.5s when tapping Analyze!)
const GRADIO_UPLOAD_CACHE = new Map<string, { remotePath: string; uploadedAt: number }>();
const GRADIO_PREUPLOAD_INFLIGHT = new Map<string, Promise<string | null>>();
const GRADIO_CACHE_TTL_MS = 8 * 60 * 1000;
const QWEN_SPACE_URL = 'https://developer0hye-qwen2-5-vl-7b-instruct.hf.space';

// Short-term result cache for identical photo + description scans (instant 0ms on accidental re-click)
const ANALYSIS_CACHE = new Map<string, GeminiMealAnalysis>();

function cacheSet(key: string, val: GeminiMealAnalysis): void {
  if (ANALYSIS_CACHE.size >= 15) {
    const oldest = ANALYSIS_CACHE.keys().next().value;
    if (oldest) ANALYSIS_CACHE.delete(oldest);
  }
  ANALYSIS_CACHE.set(key, val);
}

export function clearAnalysisCachesForTest(): void {
  ANALYSIS_CACHE.clear();
  GRADIO_UPLOAD_CACHE.clear();
  GRADIO_PREUPLOAD_INFLIGHT.clear();
}

/**
 * 選完照片後於背景預先上傳到免費雲端節點：當使用者正在選餐別或點快捷標籤時，圖片已傳好，按下「算卡路里」直接少等 1~2.5 秒！
 */
export function preuploadMealPhotoForFastScan(imageBase64: string): void {
  if (!imageBase64 || typeof fetch !== 'function' || typeof FormData === 'undefined') return;
  const fp = makeFastFingerprint(imageBase64);
  const existing = GRADIO_UPLOAD_CACHE.get(fp);
  if (existing && Date.now() - existing.uploadedAt < GRADIO_CACHE_TTL_MS) return;
  if (GRADIO_PREUPLOAD_INFLIGHT.has(fp)) return;

  const task = (async (): Promise<string | null> => {
    try {
      const blob = base64ToJpegBlob(imageBase64);
      const form = new FormData();
      form.append('files', blob, 'meal.jpg');
      const res = await fetchWithTimeout(
        `${QWEN_SPACE_URL}/gradio_api/upload`,
        { method: 'POST', body: form },
        9000
      );
      if (!res.ok) return null;
      const arr = (await res.json()) as string[];
      const remotePath = arr?.[0];
      if (!remotePath) return null;
      GRADIO_UPLOAD_CACHE.set(fp, { remotePath, uploadedAt: Date.now() });
      return remotePath;
    } catch {
      return null;
    } finally {
      GRADIO_PREUPLOAD_INFLIGHT.delete(fp);
    }
  })();
  GRADIO_PREUPLOAD_INFLIGHT.set(fp, task);
}

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

function throwIfUserAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('已取消這次 AI 分析，妳可以直接改用速查或重拍喔 ✨');
    err.name = 'UserAbortError';
    throw err;
  }
}

function isUserAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'UserAbortError';
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  throwIfUserAborted(externalSignal);
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timedOut = false;
  const onExternalAbort = () => ctrl?.abort();
  if (externalSignal && ctrl) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = ctrl
    ? setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, timeoutMs)
    : null;
  try {
    return await fetch(url, { ...init, signal: ctrl?.signal });
  } catch (err) {
    if (externalSignal?.aborted && !timedOut) {
      throwIfUserAborted(externalSignal);
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
    if (externalSignal && ctrl) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
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

async function resolveGradioRemotePath(
  baseUrl: string,
  imageBlob: Blob,
  cacheKey?: string,
  externalSignal?: AbortSignal,
  onProgress?: (stage: string) => void
): Promise<string> {
  if (cacheKey && baseUrl === QWEN_SPACE_URL) {
    const cached = GRADIO_UPLOAD_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.uploadedAt < GRADIO_CACHE_TTL_MS) {
      return cached.remotePath;
    }
    const inflight = GRADIO_PREUPLOAD_INFLIGHT.get(cacheKey);
    if (inflight) {
      onProgress?.('📤 等待背景預傳照片完成...');
      const prePath = await inflight;
      throwIfUserAborted(externalSignal);
      if (prePath) return prePath;
    }
  }

  onProgress?.('📤 正在上傳壓縮照片...');
  const form = new FormData();
  form.append('files', imageBlob, 'meal.jpg');
  const upRes = await fetchWithTimeout(
    `${baseUrl}/gradio_api/upload`,
    { method: 'POST', body: form },
    10000,
    externalSignal
  );
  if (!upRes.ok) throw new Error(`Upload ${upRes.status}`);
  const upJson = (await upRes.json()) as string[];
  const remotePath = upJson?.[0];
  if (!remotePath) throw new Error('Missing upload path');
  if (cacheKey && baseUrl === QWEN_SPACE_URL) {
    GRADIO_UPLOAD_CACHE.set(cacheKey, { remotePath, uploadedAt: Date.now() });
  }
  return remotePath;
}

async function callGradioSpaceVisionOnce(
  baseUrl: string,
  endpoint: string,
  imageBlob: Blob,
  buildPayload: (fileData: Record<string, unknown>) => unknown[],
  opts?: {
    cacheKey?: string;
    sseTimeoutMs?: number;
    signal?: AbortSignal;
    onProgress?: (stage: string) => void;
  }
): Promise<string> {
  const remotePath = await resolveGradioRemotePath(
    baseUrl,
    imageBlob,
    opts?.cacheKey,
    opts?.signal,
    opts?.onProgress
  );

  opts?.onProgress?.('🧠 排隊喚醒免費視覺 GPU 辨識菜色中...');
  const fileData = { path: remotePath, meta: { _type: 'gradio.FileData' } };
  const callRes = await fetchWithTimeout(
    `${baseUrl}/gradio_api/call${endpoint}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: buildPayload(fileData) }),
    },
    10000,
    opts?.signal
  );
  if (!callRes.ok) throw new Error(`Call ${callRes.status}`);
  const { event_id: eventId } = (await callRes.json()) as { event_id?: string };
  if (!eventId) throw new Error('Missing event_id');

  const sseRes = await fetchWithTimeout(
    `${baseUrl}/gradio_api/call${endpoint}/${eventId}`,
    { method: 'GET' },
    opts?.sseTimeoutMs ?? 24000,
    opts?.signal
  );
  if (!sseRes.ok) throw new Error(`SSE ${sseRes.status}`);
  const sseText = await sseRes.text();
  opts?.onProgress?.('✨ 正在整理菜色熱量與營養素...');
  return parseGradioSseOutput(sseText);
}

async function callGradioSpaceVisionWithRetry(
  baseUrl: string,
  endpoint: string,
  imageBlob: Blob,
  buildPayload: (fileData: Record<string, unknown>) => unknown[],
  maxAttempts = 2,
  opts?: {
    cacheKey?: string;
    sseTimeoutMs?: number;
    signal?: AbortSignal;
    onProgress?: (stage: string) => void;
  }
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callGradioSpaceVisionOnce(baseUrl, endpoint, imageBlob, buildPayload, opts);
    } catch (err) {
      if (isUserAbortError(err)) throw err;
      lastErr = err;
      // Do not waste retries on quota errors or slow SSE timeouts (avoid doubling a 24s wait into 48s!)
      if (err instanceof GradioQuotaError && err.isQuota) {
        break;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        break;
      }
      // Drop potentially stale remotePath cache before quick retry
      if (opts?.cacheKey) {
        GRADIO_UPLOAD_CACHE.delete(opts.cacheKey);
      }
      if (attempt < maxAttempts) {
        opts?.onProgress?.('🔄 連線小抖動，快速重試中...');
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('雲端視覺辨識暫時無回應');
}

/** 精簡高速版視覺提示詞（供免費 Qwen2.5-VL 使用，減少 ~70% 輸入 Token 同時保留順時針空盤掃描＋營養標示規則！） */
const FAST_VISION_SYSTEM_PROMPT = `你是台灣療癒營養師 Quokka & BOBO。請辨識圖片中的餐點或包裝背面「營養標示／成分表」，逐項拆解估算 kcal、proteinG、carbsG、fatG（繁體中文）。
規則：
1. 無分隔空盤／自助餐盤：沿 12→3→6→9點→中央順時針逐撮列出每種菜，嚴禁合併成「什錦炒菜」或跳過反光／深色菜。每樣夾一點（半份 40~50g）按清炒菜 30~45、蛋豆腐 60~85、茄子冬粉 70~95、肉片 95~160、小飯 90~140 kcal 估；滿格 80g 用正常份量。
2. 包裝背面營養標示：逐字直讀「每份熱量/蛋白/脂肪/碳水」與「含幾份」；找不到品名則由成分推斷或命名「包裝食品(營養標示直讀)」。
3. 嚴格只回純 JSON（不加 Markdown）：
{"title":"簡短總稱","items":[{"name":"菜名","portion":"份量","calories":120,"proteinG":6,"carbsG":10,"fatG":5}],"praise":"20~35字溫柔誇誇🤎✨"}`;

const NUTRITION_SYSTEM_PROMPT = `你是台灣最溫柔療癒的營養師夥伴「DINOTAENG 短尾矮袋鼠 Quokka 與雪白軟糖小熊 BOBO」。
請根據圖片或文字內容（支援兩種情境：① 實體餐盤／便當／美食照 ② 商品包裝背面的「營養標示 Nutrition Facts／成分表」），拆解食物項目並計算熱量（kcal）與三大營養素（蛋白質 proteinG、碳水 carbsG、脂肪 fatG，單位公克）。

【重要規則】：
1. 若圖片是「無分隔大空盤／圓盤自己夾菜（每樣都夾一點）」或「公司員工餐廳／台式自助餐盤」（最高優先防漏抓鐵則！）：
   - 🚨 【無分隔空盤・順時針分堆掃描法】：使用者常拿「沒有格子的空盤」自己夾 4~7 樣菜，每樣都只夾一點點並靠在一起！請務必沿著盤子「12點鐘方向 -> 3點鐘 -> 6點鐘 -> 9點鐘 -> 盤子正中央」順時針仔細分辨每一小撮（每一小堆）不同顏色、形狀、材質的菜色！只要是不同菜（例如旁邊有一小撮花椰菜、兩塊豆干、幾口炒蛋、幾片肉、一小口飯），每一小撮都必須在 items 陣列中獨立列出一筆，絕對禁止因為裝在同一個無分隔空盤裡就把多種配菜合併成一筆「什錦炒菜」或「自助餐便當」！
   - 🚨 【「每樣夾一點」小份量精準換算】：在空盤夾很多樣菜時，每一小撮通常只有標準份量的半份（約 35~50g，幾口的量）！若畫面中每樣菜是一小撮，或使用者備註「空盤夾菜」、「每樣夾一點」，請自動以「小份／半份」估算熱量並於 portion 標明「夾一點(約40~50g)」：
     * 一小撮清炒葉菜/花椰菜/豆芽/菇類（約 40~50g）：約 30~45 kcal
     * 一小撮番茄炒蛋/蔥蛋/麻婆豆腐/豆干豆包（約 2~3 小塊）：約 60~85 kcal
     * 一小撮吸油炒茄子/炒冬粉/甜不辣：約 70~95 kcal
     * 主菜肉類若只是夾幾塊肉片/雞肉塊（非整隻大雞腿）：約 95~160 kcal；若是整隻滷雞腿/排骨則為 235~360 kcal
     * 一小坨白飯/紫米飯（幾口~小半碗）：約 90~140 kcal
   - 🚨 【反光或靠在一起的菜色嚴禁跳過不列】：即使某一小撮因為反光、湯汁顏色深或跟隔壁菜靠很近而不確定具體菜名，也「絕對禁止直接漏掉跳過」！請依照該撮食物的顏色與質地列出最接近的台式自助餐菜色（例如：深綠色葉菜列為「清炒深綠時蔬(空心菜/地瓜葉)」、淺綠葉菜列為「清炒高麗菜/小白菜」、黃色塊狀列為「炒蛋/蒸蛋」、深褐色塊狀列為「滷豆干/紅燒豆腐/滷肉」、紫黑色條狀列為「紅燒茄子/木耳」）。
   - 若是一般標準分格餐盤且每格夾滿（約 80g = 1份），則按標準 1 份計算（清炒菜 55~70 kcal、蛋與豆腐格 110~150 kcal）。若使用者備註「空盤夾5~6樣」、「沒夾飯」、「飯半碗」，請 100% 對齊備註的樣數與份量！
2. 若圖片是「商品包裝背面／營養標示／成分表」：
   - 請逐字精準讀取表格內的「每一份量」、「本包裝含幾份」以及「每份」的熱量（大卡/kcal）、蛋白質、脂肪、碳水化合物數字，100% 以包裝印製數字為準！
   - 背面通常只印小字「品名：...」或「成分：...」，請優先找「品名」；若沒拍到品名，請從「成分表前2~3項原料」推斷商品內容作為名稱；若整張圖只有純營養標示表格，請命名為「包裝食品／飲品（營養標示精準直讀）」，絕對禁止回答「看不到食物」或回傳空陣列！
   - 若為瓶裝飲料且「本包裝含 2 份」且未特別註明只喝半瓶，可算整瓶（2份）並在 portion 清楚註明「1整瓶 (含2份，每份X大卡)」；若為多份量零食袋（含 3 份以上），預設算「1份 (全包共X份，依營養標示)」。
3. 若圖片是一般餐點（早午餐、小吃、手搖飲）：請以台灣常見份量逐項拆解估算，若備註提到「白飯吃一半」、「去皮少油」、「無糖/微糖」請務必反映在份量與熱量中！

請嚴格只回傳 JSON 物件（不要加 Markdown 語法），格式如下：
{
  "title": "簡短可愛的餐點或商品總稱（繁體中文）",
  "items": [
    { "name": "食物或商品名稱", "portion": "份量說明（如 1格約80g / 半碗 / 1份依營養標示）", "calories": 280, "proteinG": 24, "carbsG": 8, "fatG": 15 }
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
  category: MealCategory,
  opts?: { signal?: AbortSignal; onProgress?: (stage: string) => void }
): Promise<GeminiMealAnalysis> {
  const startedAt = Date.now();
  const now = Date.now();
  const pollinationsReady = now - lastPollinationsCallAt >= 46_000;

  const tryPollinations = async (): Promise<GeminiMealAnalysis> => {
    opts?.onProgress?.('⚡ 連線文字極速 AI 精算熱量...');
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
      12000,
      opts?.signal
    );
    if (!res.ok) {
      throw new Error(`Pollinations HTTP ${res.status}`);
    }
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('Empty Pollinations content');
    const parsed = parseGeminiNutritionJson(content, category);
    return { ...parsed, source: 'keyless-text', elapsedMs: Date.now() - startedAt };
  };

  const tryQwenTextMode = async (): Promise<GeminiMealAnalysis> => {
    opts?.onProgress?.('🧠 切換備援視覺雲端引擎計算...');
    const blankBlob = createTinyBlankJpegBlob();
    const fullPrompt = `（忽略空白圖，僅依文字計算）\n${FAST_VISION_SYSTEM_PROMPT}\n\n${mealContext}`;
    const raw = await callGradioSpaceVisionWithRetry(
      QWEN_SPACE_URL,
      '/qwen_vl_inference',
      blankBlob,
      (fd) => [fd, fullPrompt],
      1,
      { signal: opts?.signal, onProgress: opts?.onProgress, sseTimeoutMs: 20000 }
    );
    const parsed = parseGeminiNutritionJson(raw, category);
    return { ...parsed, source: 'keyless-text', elapsedMs: Date.now() - startedAt };
  };

  if (pollinationsReady) {
    try {
      return await tryPollinations();
    } catch (err) {
      if (isUserAbortError(err)) throw err;
      return await tryQwenTextMode();
    }
  } else {
    try {
      return await tryQwenTextMode();
    } catch (err) {
      if (isUserAbortError(err)) throw err;
      return await tryPollinations();
    }
  }
}

/**
 * 一步到位免金鑰照片分析（精簡 Prompt + 680px 預傳快取，大幅縮短等待時間！）
 */
async function analyzePhotoKeylessDirect(params: {
  imageBase64: string;
  hdImageBase64?: string;
  descriptionText?: string;
  category: MealCategory;
  isLabelMode: boolean;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
}): Promise<GeminiMealAnalysis> {
  const startedAt = Date.now();
  const blob = base64ToJpegBlob(params.imageBase64);
  const cacheKey = makeFastFingerprint(params.imageBase64);
  const userNote = params.descriptionText?.trim()
    ? `\n備註（優先採用）：「${params.descriptionText.trim()}」`
    : '';

  const oneShotPrompt = `${FAST_VISION_SYSTEM_PROMPT}${userNote}\n${
    params.isLabelMode
      ? '本圖偏向商品背面「營養標示／成分表」，請優先逐字直讀表格熱量與份數，只回純 JSON！'
      : '若是無分隔空盤或自助餐盤，請順時針 12→3→6→9點→中央逐撮拆出每道菜，只回純 JSON！'
  }`;

  try {
    const raw = await callGradioSpaceVisionWithRetry(
      QWEN_SPACE_URL,
      '/qwen_vl_inference',
      blob,
      (fd) => [fd, oneShotPrompt],
      2,
      {
        cacheKey,
        sseTimeoutMs: 22000,
        signal: params.signal,
        onProgress: params.onProgress,
      }
    );
    const parsed = parseGeminiNutritionJson(raw, params.category);
    return { ...parsed, source: 'keyless-vision', elapsedMs: Date.now() - startedAt };
  } catch (visionErr) {
    if (isUserAbortError(visionErr)) throw visionErr;

    // 保底通道 1：只有拍「包裝背面營養標示 / 高清模式」時才載入 ~15MB 離線 OCR，避免一般餐盤白等下載時間！
    if (params.isLabelMode) {
      params.onProgress?.('🔎 改用本機離線 OCR 讀取包裝營養標示...');
      const localLabelResult = await tryBrowserLocalNutritionLabelOcr(
        params.hdImageBase64 || params.imageBase64,
        params.descriptionText,
        params.category
      );
      throwIfUserAborted(params.signal);
      if (localLabelResult) {
        return { ...localLabelResult, source: 'local-ocr', elapsedMs: Date.now() - startedAt };
      }
    }

    // 保底通道 2：若使用者有輸入餐點文字，優先走 0.01 秒本機庫或快速文字 AI（免看圖不報錯！）
    if (params.descriptionText?.trim()) {
      const localTextHit = estimateMealLocallyInstant(params.descriptionText, params.category);
      if (localTextHit.allMatched) {
        return {
          title: localTextHit.title,
          items: localTextHit.items,
          totalCalories: localTextHit.totalCalories,
          proteinG: localTextHit.proteinG,
          carbsG: localTextHit.carbsG,
          fatG: localTextHit.fatG,
          praise: localTextHit.praise,
          source: 'local-instant',
          elapsedMs: Date.now() - startedAt,
        };
      }
      return estimateNutritionKeyless(
        `【使用者餐點描述】：「${params.descriptionText.trim()}」`,
        params.category,
        { signal: params.signal, onProgress: params.onProgress }
      );
    }

    // 保底通道 3：快檢備援視覺節點（上限 7 秒，若 CPU 節點休眠就不白等 30 秒！）
    try {
      params.onProgress?.('🛟 嘗試備援影像節點（最多 7 秒）...');
      const caption = await callGradioSpaceVisionOnce(
        'https://prithivmlmods-florence-2-image-caption.hf.space',
        '/describe_image',
        blob,
        (fd) => [fd, 'Florence-2-base'],
        { sseTimeoutMs: 7000, signal: params.signal }
      );
      if (caption) {
        return await estimateNutritionKeyless(
          `【AI 照片辨識結果】：${caption}`,
          params.category,
          { signal: params.signal, onProgress: params.onProgress }
        );
      }
    } catch (err) {
      if (isUserAbortError(err)) throw err;
    }

    if (visionErr instanceof GradioQuotaError && visionErr.isQuota) {
      throw new Error(
        '免費雲端視覺 GPU 在目前網路 IP 的今日額度剛好用完囉 🥺 妳可以：① 填免費 Gemini API Key 享 1~3 秒高速拍（每日 1,500 張）、② 在上方文字欄打菜名秒算、或 ③ 切到「台灣美食速查」一鍵點選！'
      );
    }

    throw new Error(
      '免費共用視覺伺服器現在塞車了 🥺 建議：① 再點一次重試、② 到右上角 ⚙️ 貼入免費 Gemini API Key 改成 1~3 秒直連、或 ③ 直接用文字描述／自助餐速查 0 秒記完！'
    );
  }
}

function buildGeminiGenerationConfig(model: string, temperature: number): Record<string, unknown> {
  const cfg: Record<string, unknown> = {
    temperature,
    responseMimeType: 'application/json',
    maxOutputTokens: 900,
  };
  // Gemini 2.5 預設開啟思考模式 (thinking) 會多拖 5~12 秒；關閉後辨識熱量只要 1.5~3 秒！
  if (model.startsWith('gemini-2.5-')) {
    cfg.thinkingConfig = { thinkingBudget: 0 };
  }
  return cfg;
}

/**
 * 主入口：
 * 1) 有自備 Gemini API Key -> 直連 Gemini 2.5 Flash（關閉思考延遲 `thinkingBudget: 0`，1.5~3 秒秒回！）
 * 2) 純文字且命中內建 80+ 台灣食物庫 -> 0.01 秒本機秒算！
 * 3) 免金鑰照片 -> 預設走 680px 極速餐盤照 + 預傳快取 + 精簡 Prompt（營養標示自動升 1280px 高清）
 */
export async function analyzeMealWithGemini(params: {
  apiKey?: string;
  category: MealCategory;
  descriptionText?: string;
  imageBase64?: string;
  fastImageBase64?: string;
  imageMimeType?: string;
  qualityMode?: PhotoQualityMode;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
}): Promise<GeminiMealAnalysis> {
  const startedAt = Date.now();
  const cleanKey = (params.apiKey || '').trim();
  const cleanText = (params.descriptionText || '').trim();
  const hasPhoto = Boolean(params.imageBase64 || params.fastImageBase64);
  const effectiveMode: PhotoQualityMode =
    params.qualityMode || (isNutritionLabelHint(cleanText) ? 'hd' : 'fast');

  // Choose 680px fast image for plates/dishes, 1280px HD image for nutrition-label small print
  const chosenImageBase64 =
    effectiveMode === 'hd'
      ? params.imageBase64 || params.fastImageBase64
      : params.fastImageBase64 || params.imageBase64;

  // Instant 0ms cache lookup for identical photo + note re-clicks
  const cacheKey = hasPhoto && chosenImageBase64
    ? `p|${params.category}|${effectiveMode}|${cleanText}|${makeFastFingerprint(chosenImageBase64)}`
    : `t|${params.category}|${cleanText}`;
  const cached = ANALYSIS_CACHE.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      items: cached.items.map((it, idx) => ({ ...it, id: `cache-item-${Date.now()}-${idx}` })),
      source: 'cache',
      elapsedMs: 1,
    };
  }

  // Fast Path 0: 純文字且 100% 命中內建台灣食物庫 -> 0.01 秒免等待、零流量！
  if (!hasPhoto && cleanText) {
    const instant = estimateMealLocallyInstant(cleanText, params.category);
    if (instant.allMatched) {
      const result: GeminiMealAnalysis = {
        title: instant.title,
        items: instant.items,
        totalCalories: instant.totalCalories,
        proteinG: instant.proteinG,
        carbsG: instant.carbsG,
        fatG: instant.fatG,
        praise: instant.praise,
        source: 'local-instant',
        elapsedMs: Math.max(1, Date.now() - startedAt),
      };
      return result;
    }
  }

  // Path A: 使用者有選填自己的 Gemini API Key（1.5~3 秒極速直連！）
  if (cleanKey) {
    params.onProgress?.('⚡ 連線專屬 Gemini 極速通道辨識中...');
    const parts: Array<Record<string, unknown>> = [{ text: NUTRITION_SYSTEM_PROMPT }];
    if (chosenImageBase64) {
      parts.push({
        inline_data: {
          mime_type: params.imageMimeType || 'image/jpeg',
          data: chosenImageBase64,
        },
      });
    }
    parts.push({
      text: cleanText
        ? `使用者補充說明：「${cleanText}」`
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
              generationConfig: buildGeminiGenerationConfig(model, 0.25),
            }),
          },
          15000,
          params.signal
        );
        if (!res.ok) continue;
        const json = await res.json();
        const rawText: string =
          json?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || '')
            .join('') || '';
        if (rawText) {
          const parsed = parseGeminiNutritionJson(rawText, params.category);
          const result: GeminiMealAnalysis = {
            ...parsed,
            source: 'gemini',
            elapsedMs: Date.now() - startedAt,
          };
          cacheSet(cacheKey, result);
          return result;
        }
      } catch (err) {
        if (isUserAbortError(err)) throw err;
        // Fallback to next Gemini model / built-in keyless engine
      }
    }
  }

  // Path B1: 有附照片 -> 走一步到位極速免金鑰視覺引擎
  if (chosenImageBase64) {
    const result = await analyzePhotoKeylessDirect({
      imageBase64: chosenImageBase64,
      hdImageBase64: params.imageBase64,
      descriptionText: cleanText || undefined,
      category: params.category,
      isLabelMode: effectiveMode === 'hd',
      signal: params.signal,
      onProgress: params.onProgress,
    });
    cacheSet(cacheKey, result);
    return result;
  }

  // Path B2: 純文字描述 -> 走快速文字 AI 引擎
  if (!cleanText) {
    throw new Error('請先拍一張美食／營養標示照片，或輸入吃了什麼喔 🍱');
  }

  const result = await estimateNutritionKeyless(
    `【使用者餐點描述／備註】：${cleanText}`,
    params.category,
    { signal: params.signal, onProgress: params.onProgress }
  );
  cacheSet(cacheKey, result);
  return result;
}

/**
 * 當照片 AI 辨識有誤時，讓使用者直接修改菜色名稱／份量／新增漏掉項目或補充修正說明，再重新精準計算卡路里與三大營養素！
 * 若無額外修正備註且全部品項命中內建食物庫，直接 0.01 秒本機秒算！
 */
export async function recalculateMealFromEdits(params: {
  apiKey?: string;
  category: MealCategory;
  editedItems: Array<{ name: string; portion: string }>;
  correctionNote?: string;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
}): Promise<GeminiMealAnalysis> {
  const startedAt = Date.now();
  const validItems = params.editedItems
    .map((x) => ({
      name: x.name.trim(),
      portion: x.portion.trim() || '1份',
    }))
    .filter((x) => x.name.length > 0);

  if (validItems.length === 0 && !params.correctionNote?.trim()) {
    throw new Error('請至少保留一樣食物名稱，或填寫修正內容再重新計算喔 🤎');
  }

  // 0.01 秒本機極速重算（僅在沒有額外修正備註、且每道菜都能精準命中資料庫時直接回傳）
  if (!params.correctionNote?.trim()) {
    const localHit = tryRecalculateItemsLocally(validItems, params.category);
    if (localHit) {
      return {
        ...localHit,
        source: 'local-instant',
        elapsedMs: Math.max(1, Date.now() - startedAt),
      };
    }
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
    params.onProgress?.('⚡ 連線專屬 Gemini 快速重算...');
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
              generationConfig: buildGeminiGenerationConfig(model, 0.2),
            }),
          },
          15000,
          params.signal
        );
        if (!res.ok) continue;
        const json = await res.json();
        const rawText: string =
          json?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || '')
            .join('') || '';
        if (rawText) {
          const parsed = parseGeminiNutritionJson(rawText, params.category);
          return { ...parsed, source: 'gemini', elapsedMs: Date.now() - startedAt };
        }
      } catch (err) {
        if (isUserAbortError(err)) throw err;
        // Fallback to built-in keyless engine
      }
    }
  }

  return estimateNutritionKeyless(recalcPrompt, params.category, {
    signal: params.signal,
    onProgress: params.onProgress,
  });
}

export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  const clean = apiKey.trim();
  if (!clean) return false;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(clean)}`;
  const res = await fetch(endpoint);
  return res.ok;
}
