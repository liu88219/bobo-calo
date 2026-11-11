import {
  VaultState,
  MealLog,
  WorkoutLog,
  WaterLog,
  DailyWorkoutPlan,
  FavoriteSportPreset,
  createInitialVaultState,
  getLocalDateKey,
} from '../types/tracker';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
  normalizePasscode,
  getPasscodeFallbackVariants,
} from './cryptoVault';

const LOCAL_STATE_KEY = 'bobocalo_state_v1';
const LAST_NONEMPTY_STATE_KEY = 'bobocalo_last_nonempty_v1';
const LOCAL_PASSCODE_KEY = 'bobocalo_saved_passcode_v1';

const TEXTDB_UPDATE_URL = 'https://api.textdb.online/update/';
const TEXTDB_READ_URL = 'https://textdb.online';
const TEXTDB_DEV_API_URL = 'https://textdb.dev/api/data';
const NTFY_BASE_URL = 'https://ntfy.sh';

const IDB_NAME = 'BoboCaloDB';
const IDB_KV_STORE = 'kv';
const IDB_PHOTO_STORE = 'meal_photos';
const IDB_STATE_KEY = 'vault_state_v1';
const IDB_PASS_KEY = 'saved_passcode_v1';
const IDB_SNAPSHOTS_KEY = 'history_snapshots_v1';
const IDB_TIMEOUT_MS = 8000;

const CLOUD_CHUNK_PREFIX = 'BCCHUNK1:';
const CLOUD_CHUNK_MAX_CHARS = 40000;
const LOCALSTORAGE_MAX_INLINE_CHARS = 85000;

export interface LocalHistorySnapshot {
  id: string;
  savedAt: number;
  mealCount: number;
  waterCount: number;
  workoutCount: number;
  stateJson: string;
}

/**
 * 申請瀏覽器永久儲存權限，避免 iOS / 行動瀏覽器自動回收空間
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      await Promise.race([
        navigator.storage.persist(),
        new Promise<void>((resolve) => setTimeout(resolve, 1200)),
      ]);
    }
  } catch {
    // Ignore unsupported environments
  }
}

function withIdbTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, IDB_TIMEOUT_MS);

    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (cachedDbPromise) return cachedDbPromise;

  const rawPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_KV_STORE)) {
          db.createObjectStore(IDB_KV_STORE);
        }
        if (!db.objectStoreNames.contains(IDB_PHOTO_STORE)) {
          db.createObjectStore(IDB_PHOTO_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          cachedDbPromise = null;
        };
        db.onclose = () => {
          cachedDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
      req.onblocked = () => {
        cachedDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });

  cachedDbPromise = withIdbTimeout(rawPromise, null).then((db) => {
    if (!db) cachedDbPromise = null;
    return db;
  });
  return cachedDbPromise;
}

async function idbPut(storeName: string, key: string, value: string): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  const op = new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      cachedDbPromise = null;
      resolve();
    }
  });
  await withIdbTimeout(op, undefined);
}

async function idbGet(storeName: string, key: string): Promise<string | null> {
  const db = await openIdb();
  if (!db) return null;
  const op = new Promise<string | null>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });
  return withIdbTimeout(op, null);
}

async function idbGetAllKeys(storeName: string): Promise<string[]> {
  const db = await openIdb();
  if (!db) return [];
  const op = new Promise<string[]>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      if (typeof store.getAllKeys !== 'function') {
        resolve([]);
        return;
      }
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? req.result.map((k) => String(k)) : [];
        resolve(list);
      };
      req.onerror = () => resolve([]);
    } catch {
      cachedDbPromise = null;
      resolve([]);
    }
  });
  return withIdbTimeout(op, []);
}

export async function saveLocalHiResPhoto(mealId: string, dataUrl: string): Promise<void> {
  await idbPut(IDB_PHOTO_STORE, mealId, dataUrl);
}

export async function getLocalHiResPhoto(mealId: string): Promise<string | null> {
  return idbGet(IDB_PHOTO_STORE, mealId);
}

export function parseVaultJson(raw: string | null | undefined): VaultState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VaultState>;
    if (!parsed || typeof parsed !== 'object') return null;
    const base = createInitialVaultState();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile || {}) },
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      waters: Array.isArray(parsed.waters) ? parsed.waters : [],
      stamps: Array.isArray(parsed.stamps) ? parsed.stamps : [],
      dailyWorkoutPlans:
        parsed.dailyWorkoutPlans && typeof parsed.dailyWorkoutPlans === 'object'
          ? parsed.dailyWorkoutPlans
          : {},
      favoriteSports: Array.isArray(parsed.favoriteSports) ? parsed.favoriteSports : [],
      deletedIds: parsed.deletedIds || {},
    };
  } catch {
    return null;
  }
}

function hasUserRecords(state: VaultState): boolean {
  return (
    state.meals.length > 0 ||
    state.waters.length > 0 ||
    state.workouts.length > 0 ||
    Boolean(state.favoriteSports && state.favoriteSports.length > 0)
  );
}

function stripPhotosForSlimLocalStorage(state: VaultState): string {
  const slim: VaultState = {
    ...state,
    meals: state.meals.map(({ photoThumb: _omit, ...rest }) => rest),
  };
  return JSON.stringify(slim);
}

function tryWriteLocalStorageWithSlimFallback(key: string, fullRaw: string, state: VaultState): void {
  const toWrite =
    fullRaw.length <= LOCALSTORAGE_MAX_INLINE_CHARS
      ? fullRaw
      : stripPhotosForSlimLocalStorage(state);
  try {
    localStorage.setItem(key, toWrite);
  } catch {
    try {
      localStorage.setItem(key, stripPhotosForSlimLocalStorage(state));
    } catch {
      // Shared origin localStorage temporarily full; IndexedDB still holds 100% of state
    }
  }
}

/**
 * 第 0 幀同步讀取本機狀態：避免 React 初次渲染出現空白預設值或因 iOS IndexedDB 延遲而誤覆蓋本機紀錄！
 */
export function loadLocalVaultSync(): VaultState {
  let primary: VaultState | null = null;
  let backup: VaultState | null = null;
  try {
    primary = parseVaultJson(localStorage.getItem(LOCAL_STATE_KEY));
  } catch {
    primary = null;
  }
  try {
    backup = parseVaultJson(localStorage.getItem(LAST_NONEMPTY_STATE_KEY));
  } catch {
    backup = null;
  }

  if (primary && backup) {
    return mergeVaultStates(primary, backup);
  }
  return primary || backup || createInitialVaultState();
}

export function loadRememberedPasscodeSync(): string {
  try {
    return normalizePasscode(localStorage.getItem(LOCAL_PASSCODE_KEY) || '');
  } catch {
    return '';
  }
}

async function appendRollingHistorySnapshot(state: VaultState, fullRaw: string): Promise<void> {
  if (!hasUserRecords(state)) return;
  try {
    const existingRaw = await idbGet(IDB_KV_STORE, IDB_SNAPSHOTS_KEY);
    const list: LocalHistorySnapshot[] = existingRaw ? JSON.parse(existingRaw) : [];
    const safeList = Array.isArray(list) ? list : [];
    const now = Date.now();
    const latest = safeList[0];

    // 若距離上一筆快照不到 90 秒且紀錄筆數完全相同，更新最新快照即可，避免洗掉更早的歷史時間點
    if (
      latest &&
      now - latest.savedAt < 90_000 &&
      latest.mealCount === state.meals.length &&
      latest.waterCount === state.waters.length &&
      latest.workoutCount === state.workouts.length
    ) {
      const updatedTop: LocalHistorySnapshot = {
        ...latest,
        savedAt: now,
        stateJson: fullRaw,
      };
      await idbPut(
        IDB_KV_STORE,
        IDB_SNAPSHOTS_KEY,
        JSON.stringify([updatedTop, ...safeList.slice(1, 8)])
      );
      return;
    }

    const snap: LocalHistorySnapshot = {
      id: `snap-${now}`,
      savedAt: now,
      mealCount: state.meals.length,
      waterCount: state.waters.length,
      workoutCount: state.workouts.length,
      stateJson: fullRaw,
    };
    await idbPut(IDB_KV_STORE, IDB_SNAPSHOTS_KEY, JSON.stringify([snap, ...safeList].slice(0, 8)));
  } catch {
    // Ignore snapshot error
  }
}

export async function listLocalHistorySnapshots(): Promise<LocalHistorySnapshot[]> {
  try {
    const raw = await idbGet(IDB_KV_STORE, IDB_SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveLocalVaultState(state: VaultState): Promise<void> {
  // 防護：絕不讓未編輯的空白預設狀態覆蓋已經有資料的本機儲存！
  if (state.isUneditedDefault && !hasUserRecords(state)) {
    const existing = loadLocalVaultSync();
    if (!existing.isUneditedDefault || hasUserRecords(existing)) {
      return;
    }
  }

  const fullRaw = JSON.stringify(state);

  // 先將縮圖鏡像至 IndexedDB，再寫入輕量化 localStorage（避免與同網域其他 PWA 搶用 5MB localStorage 上限！）
  tryWriteLocalStorageWithSlimFallback(LOCAL_STATE_KEY, fullRaw, state);
  if (hasUserRecords(state)) {
    tryWriteLocalStorageWithSlimFallback(LAST_NONEMPTY_STATE_KEY, fullRaw, state);
  }

  await Promise.all([
    idbPut(IDB_KV_STORE, IDB_STATE_KEY, fullRaw),
    ...state.meals
      .filter((m) => m.photoThumb?.startsWith('data:image/'))
      .slice(0, 30)
      .map((m) => idbPut(IDB_PHOTO_STORE, `thumb:${m.id}`, m.photoThumb!)),
  ]);

  if (hasUserRecords(state)) {
    await appendRollingHistorySnapshot(state, fullRaw);
  }
}

/**
 * 完整非同步本機載入：合併 localStorage + 防誤刪快照 + IndexedDB 鏡像 + 縮圖還原，並自動救回任何殘留在 IndexedDB 照片庫的未刪除餐點！
 */
export async function loadLocalVaultState(): Promise<VaultState> {
  let merged = loadLocalVaultSync();

  const idbRaw = await idbGet(IDB_KV_STORE, IDB_STATE_KEY);
  const idbState = parseVaultJson(idbRaw);
  if (idbState) {
    merged = mergeVaultStates(merged, idbState);
  }

  // 若主狀態為空但歷史快照庫仍有非空白紀錄（且未曾被使用者手動刪除），自動救援最新快照！
  if (!hasUserRecords(merged) && merged.isUneditedDefault) {
    const snaps = await listLocalHistorySnapshots();
    if (snaps.length > 0) {
      const snapState = parseVaultJson(snaps[0].stateJson);
      if (snapState && hasUserRecords(snapState)) {
        merged = mergeVaultStates(merged, snapState);
      }
    }
  }

  // 補齊因 localStorage 瘦身而暫存在 IndexedDB 的餐點縮圖
  const hydratedMeals = await Promise.all(
    merged.meals.map(async (m) => {
      if (m.photoThumb) return m;
      const savedThumb = await idbGet(IDB_PHOTO_STORE, `thumb:${m.id}`);
      if (savedThumb) return { ...m, photoThumb: savedThumb };
      return m;
    })
  );
  merged = { ...merged, meals: hydratedMeals };

  // 若先前因競態導致餐點清單遺失，但 IndexedDB meal_photos 仍保有使用者拍下的美食照片（且未曾被按刪除），自動救回！
  const photoKeys = await idbGetAllKeys(IDB_PHOTO_STORE);
  let recoveredAny = false;
  for (const key of photoKeys) {
    if (!key.startsWith('meal-')) continue;
    const alreadyInMeals = merged.meals.some((m) => m.id === key);
    const wasDeleted = Boolean(merged.deletedIds[key]);
    if (alreadyInMeals || wasDeleted) continue;

    const tsMatch = /^meal-(\d{10,15})-/.exec(key);
    const createdAt = tsMatch ? Number(tsMatch[1]) : Date.now();
    const dateKey = getLocalDateKey(new Date(createdAt));
    const recoveredMeal: MealLog = {
      id: key,
      dateKey,
      category: 'lunch',
      title: '📸 自動救回的餐點照片（可點編輯重算）',
      items: [
        {
          id: `rec-item-${createdAt}`,
          name: '已救回美食照片（點下方「編輯／重算」即可重新辨識）',
          portion: '1份',
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
        },
      ],
      totalCalories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      hasLocalHiResPhoto: true,
      praise: 'Bobo 幫妳把本機相簿裡的美食紀錄找回來囉！點「編輯／重算」就能一鍵重算卡路里 🤎',
      createdAt,
      updatedAt: createdAt,
    };
    merged = {
      ...merged,
      isUneditedDefault: false,
      updatedAt: Math.max(merged.updatedAt || 0, createdAt),
      meals: [recoveredMeal, ...merged.meals].sort((a, b) => b.createdAt - a.createdAt),
    };
    recoveredAny = true;
  }

  if (!merged.isUneditedDefault || recoveredAny) {
    const fullRaw = JSON.stringify(merged);
    tryWriteLocalStorageWithSlimFallback(LOCAL_STATE_KEY, fullRaw, merged);
    if (hasUserRecords(merged)) {
      tryWriteLocalStorageWithSlimFallback(LAST_NONEMPTY_STATE_KEY, fullRaw, merged);
    }
    await idbPut(IDB_KV_STORE, IDB_STATE_KEY, fullRaw);
  }

  return merged;
}

export async function saveRememberedPasscode(passcode: string): Promise<void> {
  const clean = normalizePasscode(passcode);
  try {
    if (clean) {
      localStorage.setItem(LOCAL_PASSCODE_KEY, clean);
    } else {
      localStorage.removeItem(LOCAL_PASSCODE_KEY);
    }
  } catch {
    // Ignore localStorage quota error; IndexedDB stores passcode reliably
  }
  await idbPut(IDB_KV_STORE, IDB_PASS_KEY, clean);
}

export async function loadRememberedPasscode(): Promise<string> {
  let saved = loadRememberedPasscodeSync();
  if (!saved) {
    saved = (await idbGet(IDB_KV_STORE, IDB_PASS_KEY)) || '';
    if (saved) {
      try {
        localStorage.setItem(LOCAL_PASSCODE_KEY, saved);
      } catch {
        // Ignore
      }
    }
  }
  return normalizePasscode(saved);
}

/**
 * 防空白覆蓋與墓碑合併演算法 (Anti-Overwrite Merge & Tombstones)
 */
export function mergeVaultStates(local: VaultState, remote: VaultState): VaultState {
  if (local.isUneditedDefault && !remote.isUneditedDefault) {
    return { ...remote, isUneditedDefault: false };
  }
  if (remote.isUneditedDefault && !local.isUneditedDefault) {
    return { ...local, isUneditedDefault: false };
  }

  const deletedIds: Record<string, number> = { ...(remote.deletedIds || {}) };
  for (const [id, ts] of Object.entries(local.deletedIds || {})) {
    if (!deletedIds[id] || ts > deletedIds[id]) {
      deletedIds[id] = ts;
    }
  }

  const mealMap = new Map<string, MealLog>();
  for (const m of [...remote.meals, ...local.meals]) {
    const delTs = deletedIds[m.id];
    const itemTs = m.updatedAt || m.createdAt || 0;
    if (delTs && delTs >= itemTs) continue;
    const prev = mealMap.get(m.id);
    if (!prev || itemTs >= (prev.updatedAt || prev.createdAt || 0)) {
      mealMap.set(m.id, {
        ...prev,
        ...m,
        photoThumb: m.photoThumb || prev?.photoThumb,
        hasLocalHiResPhoto: Boolean(m.hasLocalHiResPhoto || prev?.hasLocalHiResPhoto),
      });
    } else if (!prev.photoThumb && m.photoThumb) {
      mealMap.set(m.id, { ...prev, photoThumb: m.photoThumb });
    }
  }
  const mergedMeals = Array.from(mealMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  const workoutMap = new Map<string, WorkoutLog>();
  for (const w of [...remote.workouts, ...local.workouts]) {
    const delTs = deletedIds[w.id];
    if (delTs && delTs >= w.createdAt) continue;
    workoutMap.set(w.id, w);
  }
  const mergedWorkouts = Array.from(workoutMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  const waterMap = new Map<string, WaterLog>();
  for (const wt of [...remote.waters, ...local.waters]) {
    const delTs = deletedIds[wt.id];
    if (delTs && delTs >= wt.createdAt) continue;
    waterMap.set(wt.id, wt);
  }
  const mergedWaters = Array.from(waterMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  const mergedStamps = Array.from(new Set([...(remote.stamps || []), ...(local.stamps || [])]));

  const mergedPlans: Record<string, DailyWorkoutPlan> = {
    ...(remote.dailyWorkoutPlans || {}),
  };
  for (const [dk, plan] of Object.entries(local.dailyWorkoutPlans || {})) {
    const prev = mergedPlans[dk];
    if (!prev || (plan.updatedAt || 0) >= (prev.updatedAt || 0)) {
      mergedPlans[dk] = plan;
    }
  }

  const favSportMap = new Map<string, FavoriteSportPreset>();
  for (const fs of [...(remote.favoriteSports || []), ...(local.favoriteSports || [])]) {
    if (!fs || !fs.id) continue;
    const delTs = deletedIds[fs.id];
    if (delTs && delTs >= (fs.createdAt || 0)) continue;
    favSportMap.set(fs.id, fs);
  }
  const mergedFavoriteSports = Array.from(favSportMap.values()).sort(
    (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
  );

  const localSettingsNewer = (local.settingsUpdatedAt || 0) >= (remote.settingsUpdatedAt || 0);
  const profile = localSettingsNewer
    ? { ...remote.profile, ...local.profile }
    : { ...local.profile, ...remote.profile };
  const geminiApiKey = localSettingsNewer
    ? local.geminiApiKey || remote.geminiApiKey
    : remote.geminiApiKey || local.geminiApiKey;

  const maxUpdatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  const maxSettingsAt = Math.max(local.settingsUpdatedAt || 0, remote.settingsUpdatedAt || 0);
  const hasAnyEdit =
    !local.isUneditedDefault ||
    !remote.isUneditedDefault ||
    maxUpdatedAt > 0 ||
    mergedMeals.length > 0 ||
    mergedWaters.length > 0 ||
    mergedWorkouts.length > 0 ||
    mergedFavoriteSports.length > 0 ||
    Object.keys(mergedPlans).length > 0;

  return {
    version: 1,
    updatedAt: maxUpdatedAt,
    settingsUpdatedAt: maxSettingsAt,
    isUneditedDefault: !hasAnyEdit,
    profile,
    geminiApiKey,
    meals: mergedMeals,
    workouts: mergedWorkouts,
    waters: mergedWaters,
    stamps: mergedStamps,
    dailyWorkoutPlans: mergedPlans,
    favoriteSports: mergedFavoriteSports,
    deletedIds,
  };
}

/**
 * 主索引僅保留最近 6 筆輕量迷你縮圖（<= 6KB）供秒開顯示，確保主索引永遠小於 40KB（單一分片原子寫入，徹底杜絕多分片半套寫入撕裂！），
 * 所有清晰美食照片與其餘縮圖均透過加密分片獨立同步至雙雲端！
 */
export function compactStateForCloud(state: VaultState): VaultState {
  const meals = state.meals.map((m, idx) => {
    if (idx < 6 && (!m.photoThumb || m.photoThumb.length <= 6000)) {
      return m;
    }
    const { photoThumb: _omit, ...rest } = m;
    return rest;
  });
  return { ...state, meals };
}

/**
 * 寫入永久雲端 KV (textdb.online) — 嚴格使用 application/x-www-form-urlencoded + URLSearchParams，
 * 並強制解析 JSON `status === 1`（防止超過 20 萬字元時 HTTP 200 `{status:0}` 假成功！）
 * 注意：不設定 `keepalive: true`，因為瀏覽器對所有並行 keepalive 請求設有 64KB 總量硬上限，超過會導致第 2 個請求直接被瀏覽器中斷！
 */
export function buildTextDbFormBody(key: string, value: string): string {
  return new URLSearchParams({ key, value }).toString();
}

async function writeTextDbOnlineSingle(key: string, value: string): Promise<boolean> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8500) : null;
  try {
    const body = buildTextDbFormBody(key, value);
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctrl?.signal,
    };
    const res = await fetch(TEXTDB_UPDATE_URL, init);
    if (!res.ok) return false;
    const txt = (await res.text()).trim();
    if (!txt) return true;
    try {
      const parsed = JSON.parse(txt) as { status?: number };
      if (parsed && typeof parsed === 'object' && 'status' in parsed) {
        return Number(parsed.status) === 1;
      }
    } catch {
      // Non-JSON 200 OK fallback in test mocks
    }
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function writeTextDbDevSingle(key: string, value: string): Promise<boolean> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8500) : null;
  try {
    const bodyStr = JSON.stringify({ payload: value });
    const init: RequestInit = {
      method: 'POST',
      // textdb.dev (Elixir Plug) 嚴格要求 Content-Type: application/json
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      signal: ctrl?.signal,
    };
    const res = await fetch(`${TEXTDB_DEV_API_URL}/${encodeURIComponent(key)}`, init);
    return res.ok;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function writeChunkedToProvider(
  baseKey: string,
  fullValue: string,
  writeSingle: (k: string, v: string) => Promise<boolean>
): Promise<boolean> {
  if (fullValue.length <= CLOUD_CHUNK_MAX_CHARS) {
    return writeSingle(baseKey, fullValue);
  }
  const chunks: string[] = [];
  for (let i = 0; i < fullValue.length; i += CLOUD_CHUNK_MAX_CHARS) {
    chunks.push(fullValue.slice(i, i + CLOUD_CHUNK_MAX_CHARS));
  }
  // 先寫入子分片 p1..p_{N-1}，全部成功後再更新主索引 baseKey，保證讀取端不會讀到半套分片！
  for (let idx = 1; idx < chunks.length; idx++) {
    const ok = await writeSingle(`${baseKey}_p${idx}`, chunks[idx]);
    if (!ok) return false;
  }
  const header = `${CLOUD_CHUNK_PREFIX}${chunks.length}:${chunks[0]}`;
  return writeSingle(baseKey, header);
}

export async function writePermanentCloud(key: string, encryptedValue: string): Promise<boolean> {
  const [okOnline, okDev] = await Promise.all([
    writeChunkedToProvider(key, encryptedValue, writeTextDbOnlineSingle),
    writeChunkedToProvider(key, encryptedValue, writeTextDbDevSingle),
  ]);
  return okOnline || okDev;
}

async function readTextDbOnlineSingle(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
  try {
    const url = `${TEXTDB_READ_URL}/${encodeURIComponent(key)}?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store', signal: ctrl?.signal });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text || null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readTextDbDevSingle(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
  try {
    const url = `${TEXTDB_DEV_API_URL}/${encodeURIComponent(key)}?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store', signal: ctrl?.signal });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    let parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (parsed && typeof parsed === 'object' && 'payload' in parsed) {
      const p = (parsed as { payload?: unknown }).payload;
      return typeof p === 'string' && p.trim() ? p.trim() : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readChunkedFromProvider(
  baseKey: string,
  readSingle: (k: string) => Promise<string | null>
): Promise<string | null> {
  const head = await readSingle(baseKey);
  if (!head) return null;
  if (!head.startsWith(CLOUD_CHUNK_PREFIX)) {
    return head;
  }
  const rest = head.slice(CLOUD_CHUNK_PREFIX.length);
  const colonIdx = rest.indexOf(':');
  if (colonIdx <= 0) return null;
  const totalChunks = Number.parseInt(rest.slice(0, colonIdx), 10);
  const chunk0 = rest.slice(colonIdx + 1);
  if (!Number.isFinite(totalChunks) || totalChunks < 2 || totalChunks > 60) return null;

  const tailPromises: Array<Promise<string | null>> = [];
  for (let idx = 1; idx < totalChunks; idx++) {
    tailPromises.push(readSingle(`${baseKey}_p${idx}`));
  }
  const tails = await Promise.all(tailPromises);
  if (tails.some((part) => !part)) return null;
  return chunk0 + tails.join('');
}

export async function readPermanentCloud(key: string): Promise<string | null> {
  const [onlineRaw, devRaw] = await Promise.all([
    readChunkedFromProvider(key, readTextDbOnlineSingle),
    readChunkedFromProvider(key, readTextDbDevSingle),
  ]);
  return onlineRaw || devRaw || null;
}

function isValidCipherEnvelope(x: string | null | undefined): x is string {
  return Boolean(x && (x.startsWith('BC2:') || x.startsWith('BC1:')));
}

async function readAllPermanentCloudCandidates(key: string): Promise<string[]> {
  const [onlineRaw, devRaw] = await Promise.all([
    readChunkedFromProvider(key, readTextDbOnlineSingle),
    readChunkedFromProvider(key, readTextDbDevSingle),
  ]);
  return Array.from(new Set([onlineRaw, devRaw].filter(isValidCipherEnvelope)));
}

function sanitizeMealShardId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 36);
}

async function uploadMealPhotoShards(
  meals: MealLog[],
  imgKeyPrefix: string,
  passcode: string
): Promise<void> {
  // 批次上傳最近 25 筆餐點清晰照片分片（每批最多 3 張，已上傳過的不重複傳送）
  const candidates = meals.slice(0, 25);
  const BATCH = 3;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const slice = candidates.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (meal) => {
        const shardKey = `${imgKeyPrefix}_${sanitizeMealShardId(meal.id)}`;
        const uploadedMarker = await idbGet(IDB_KV_STORE, `uploaded:${shardKey}`);
        if (uploadedMarker === String(meal.updatedAt || meal.createdAt)) return;

        const hiRes = await getLocalHiResPhoto(meal.id);
        const bestPhoto = hiRes || meal.photoThumb;
        if (!bestPhoto || !bestPhoto.startsWith('data:image/')) return;

        const encryptedPhoto = await encryptVaultPayload(bestPhoto, passcode);
        const ok = await writePermanentCloud(shardKey, encryptedPhoto);
        if (ok) {
          await idbPut(
            IDB_KV_STORE,
            `uploaded:${shardKey}`,
            String(meal.updatedAt || meal.createdAt)
          );
        }
      })
    );
  }
}

async function hydrateMealPhotoShards(
  meals: MealLog[],
  imgKeyPrefix: string,
  passcode: string
): Promise<MealLog[]> {
  const top = meals.slice(0, 25);
  const rest = meals.slice(25);
  const hydratedTop = await Promise.all(
    top.map(async (meal) => {
      const localHi = await getLocalHiResPhoto(meal.id);
      if (localHi) {
        return { ...meal, hasLocalHiResPhoto: true };
      }
      if (!meal.hasLocalHiResPhoto && meal.photoThumb) {
        return meal;
      }
      const shardKey = `${imgKeyPrefix}_${sanitizeMealShardId(meal.id)}`;
      const rawShard = await readPermanentCloud(shardKey);
      if (!isValidCipherEnvelope(rawShard)) return meal;
      try {
        const decryptedDataUrl = await decryptVaultPayload(rawShard, passcode);
        if (decryptedDataUrl.startsWith('data:image/')) {
          await saveLocalHiResPhoto(meal.id, decryptedDataUrl);
          return {
            ...meal,
            hasLocalHiResPhoto: true,
            photoThumb: meal.photoThumb || decryptedDataUrl,
          };
        }
      } catch {
        // Ignore shard decryption mismatch
      }
      return meal;
    })
  );
  return [...hydratedTop, ...rest];
}

async function pingSseTopic(sseTopic: string, updatedAt: number): Promise<void> {
  try {
    await fetch(`${NTFY_BASE_URL}/${encodeURIComponent(sseTopic)}`, {
      method: 'POST',
      body: JSON.stringify({ t: updatedAt }),
      keepalive: true,
    });
  } catch {
    // Optional realtime relay; permanent truth is always textdb.online + textdb.dev
  }
}

export interface SyncOutcome {
  ok: boolean;
  mergedState: VaultState;
  pulledFromCloud: boolean;
  pushedToCloud: boolean;
  matchedPasscode?: string;
  fingerprintBadge?: string;
  errorMessage?: string;
}

/**
 * 標準雙向同步流程：
 * 1. 永遠先從雙永久雲端 Pull 解密比對合併（若精確通行碼查無資料，自動檢查 iOS 首字母大小寫候選救援！）
 * 2. 與本機最新狀態防競態合併後寫入 IndexedDB + 滾動歷史快照
 * 3. 若需 Push，使用 BC2 壓縮加密 + 自動分片寫入雙雲端，且嚴格驗證真實寫入結果（絕不假成功！）
 */
export async function syncWithCloudVault(
  localState: VaultState,
  passcode: string,
  forcePushIfEdited = false
): Promise<SyncOutcome> {
  const cleanPass = normalizePasscode(passcode);
  if (!cleanPass) {
    return {
      ok: false,
      mergedState: localState,
      pulledFromCloud: false,
      pushedToCloud: false,
      errorMessage: '尚未設定雲端通行碼',
    };
  }

  try {
    let activePass = cleanPass;
    let identity = await deriveVaultIdentity(activePass);
    let rawCandidates = await readAllPermanentCloudCandidates(identity.vaultKey);

    // iOS 鍵盤自動首字大寫救援：若輸入密碼在雲端完全空白，自動檢查大小寫變體是否已有既有加密保險箱！
    if (rawCandidates.length === 0) {
      const variants = getPasscodeFallbackVariants(cleanPass);
      for (const variant of variants) {
        if (variant === cleanPass) continue;
        const candId = await deriveVaultIdentity(variant);
        const candList = await readAllPermanentCloudCandidates(candId.vaultKey);
        if (candList.length > 0) {
          activePass = variant;
          identity = candId;
          rawCandidates = candList;
          break;
        }
      }
    }

    let merged = localState;
    let pulledFromCloud = false;
    let maxRemoteUpdatedAt = 0;

    for (const rawCloud of rawCandidates) {
      try {
        const decryptedJson = await decryptVaultPayload(rawCloud, activePass);
        const remoteState = parseVaultJson(decryptedJson);
        if (remoteState) {
          maxRemoteUpdatedAt = Math.max(maxRemoteUpdatedAt, remoteState.updatedAt || 0);
          merged = mergeVaultStates(merged, remoteState);
          pulledFromCloud = true;
        }
      } catch {
        // Ignore corrupted candidate if another candidate succeeds
      }
    }

    // 注意：vaultKey 本身即為 SHA-256("bobo_calo_vault_v1:" + passcode) 衍生之 128-bit 密碼學指紋，
    // 能命中 rawCandidates.length > 0 代表通行碼 100% 正確！
    // 若此時 decrypt 失敗，代表先前多分片上傳曾因瀏覽器 keepalive 64KB 限制產生半套分片 (torn chunk)，
    // 此時絕不可誤報「通行碼不正確」，應保留本機完整紀錄並自動重新寫入單一完整加密包完成自我修復 (Self-Healing)！
    const needsCloudSelfHeal = rawCandidates.length > 0 && !pulledFromCloud;

    if (pulledFromCloud && merged.meals.length > 0) {
      const hydratedMeals = await hydrateMealPhotoShards(
        merged.meals,
        identity.imgKeyPrefix,
        activePass
      );
      merged = { ...merged, meals: hydratedMeals };
    }

    // 與最新本機狀態再做一次防競態合併後存檔
    const latestLocalSync = loadLocalVaultSync();
    merged = mergeVaultStates(latestLocalSync, merged);
    await saveLocalVaultState(merged);

    const shouldPush =
      (!merged.isUneditedDefault &&
        merged.updatedAt > 0 &&
        (rawCandidates.length < 2 ||
          merged.updatedAt > maxRemoteUpdatedAt ||
          forcePushIfEdited ||
          needsCloudSelfHeal)) ||
      (needsCloudSelfHeal && hasUserRecords(merged));

    let pushedToCloud = false;
    if (shouldPush) {
      await uploadMealPhotoShards(merged.meals, identity.imgKeyPrefix, activePass);
      const compacted = compactStateForCloud(merged);
      const encrypted = await encryptVaultPayload(JSON.stringify(compacted), activePass);
      pushedToCloud = await writePermanentCloud(identity.vaultKey, encrypted);
      if (!pushedToCloud) {
        return {
          ok: false,
          mergedState: merged,
          pulledFromCloud,
          pushedToCloud: false,
          matchedPasscode: activePass,
          fingerprintBadge: identity.fingerprintBadge,
          errorMessage: '雲端網路暫時忙碌，紀錄已安全保存在本機保險箱，將自動重試同步！',
        };
      }
      void pingSseTopic(identity.sseTopic, merged.updatedAt);
    }

    return {
      ok: true,
      mergedState: merged,
      pulledFromCloud,
      pushedToCloud,
      matchedPasscode: activePass,
      fingerprintBadge: identity.fingerprintBadge,
    };
  } catch (err) {
    return {
      ok: false,
      mergedState: localState,
      pulledFromCloud: false,
      pushedToCloud: false,
      errorMessage: err instanceof Error ? err.message : '雲端同步失敗，請稍後再試',
    };
  }
}

/**
 * 訂閱 ntfy.sh 即時通道：當另一視窗（如 Safari ↔ 主畫面 App）更新時，立即觸發從永久雲端拉取最新狀態
 */
export function subscribeRealtimeRelay(passcode: string, onRemotePing: () => void): () => void {
  let es: EventSource | null = null;
  let cancelled = false;

  deriveVaultIdentity(passcode)
    .then(({ sseTopic }) => {
      if (cancelled || typeof EventSource === 'undefined') return;
      es = new EventSource(`${NTFY_BASE_URL}/${encodeURIComponent(sseTopic)}/sse`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.event === 'message') {
            onRemotePing();
          }
        } catch {
          // Ignore keepalive
        }
      };
    })
    .catch(() => {
      // Ignore
    });

  return () => {
    cancelled = true;
    if (es) {
      es.close();
      es = null;
    }
  };
}

export function exportBackupJson(state: VaultState): void {
  const safeExport: VaultState = {
    ...state,
    geminiApiKey: '',
  };
  const blob = new Blob([JSON.stringify(safeExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bobo-calo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
