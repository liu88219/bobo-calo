import {
  VaultState,
  MealLog,
  WorkoutLog,
  WaterLog,
  createInitialVaultState,
  getLocalDateKey,
} from '../types/tracker';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
  normalizePasscode,
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
const IDB_TIMEOUT_MS = 1500;

/**
 * 申請瀏覽器永久儲存權限，避免 iOS / 行動瀏覽器自動回收空間
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      await Promise.race([
        navigator.storage.persist(),
        new Promise<void>((resolve) => setTimeout(resolve, 1000)),
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

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
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
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return withIdbTimeout(rawPromise, null);
}

async function idbPut(storeName: string, key: string, value: string): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  const op = new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
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
      req.onsuccess = () => {
        db.close();
        resolve(typeof req.result === 'string' ? req.result : null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
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
        db.close();
        resolve([]);
        return;
      }
      const req = store.getAllKeys();
      req.onsuccess = () => {
        db.close();
        const list = Array.isArray(req.result)
          ? req.result.map((k) => String(k))
          : [];
        resolve(list);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
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

function parseVaultJson(raw: string | null | undefined): VaultState | null {
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
      deletedIds: parsed.deletedIds || {},
    };
  } catch {
    return null;
  }
}

function hasUserRecords(state: VaultState): boolean {
  return state.meals.length > 0 || state.waters.length > 0 || state.workouts.length > 0;
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

export async function saveLocalVaultState(state: VaultState): Promise<void> {
  // 防護：絕不讓未編輯的空白預設狀態覆蓋已經有資料的本機儲存！
  if (state.isUneditedDefault && !hasUserRecords(state)) {
    const existing = loadLocalVaultSync();
    if (!existing.isUneditedDefault || hasUserRecords(existing)) {
      return;
    }
  }

  const raw = JSON.stringify(state);
  try {
    localStorage.setItem(LOCAL_STATE_KEY, raw);
    if (hasUserRecords(state)) {
      localStorage.setItem(LAST_NONEMPTY_STATE_KEY, raw);
    }
  } catch {
    // Quota or private mode fallback to IndexedDB
  }
  await idbPut(IDB_KV_STORE, IDB_STATE_KEY, raw);
}

/**
 * 完整非同步本機載入：合併 localStorage + 防誤刪快照 + IndexedDB 鏡像，並自動救回任何殘留在 IndexedDB 照片庫的未刪除餐點！
 */
export async function loadLocalVaultState(): Promise<VaultState> {
  let merged = loadLocalVaultSync();

  const idbRaw = await idbGet(IDB_KV_STORE, IDB_STATE_KEY);
  const idbState = parseVaultJson(idbRaw);
  if (idbState) {
    merged = mergeVaultStates(merged, idbState);
  }

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
    try {
      const raw = JSON.stringify(merged);
      localStorage.setItem(LOCAL_STATE_KEY, raw);
      if (hasUserRecords(merged)) {
        localStorage.setItem(LAST_NONEMPTY_STATE_KEY, raw);
      }
    } catch {
      // Ignore
    }
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
    // Ignore
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
  // 若本機為尚未編輯過的預設空白狀態，直接採用雲端已編輯資料
  if (local.isUneditedDefault && !remote.isUneditedDefault) {
    return { ...remote, isUneditedDefault: false };
  }
  if (remote.isUneditedDefault && !local.isUneditedDefault) {
    return { ...local, isUneditedDefault: false };
  }

  // 合併刪除墓碑
  const deletedIds: Record<string, number> = { ...(remote.deletedIds || {}) };
  for (const [id, ts] of Object.entries(local.deletedIds || {})) {
    if (!deletedIds[id] || ts > deletedIds[id]) {
      deletedIds[id] = ts;
    }
  }

  // 合併餐點紀錄（保留最新 updatedAt，過濾已刪除墓碑）
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
      });
    }
  }
  const mergedMeals = Array.from(mealMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  // 合併運動紀錄
  const workoutMap = new Map<string, WorkoutLog>();
  for (const w of [...remote.workouts, ...local.workouts]) {
    const delTs = deletedIds[w.id];
    if (delTs && delTs >= w.createdAt) continue;
    workoutMap.set(w.id, w);
  }
  const mergedWorkouts = Array.from(workoutMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  // 合併喝水紀錄
  const waterMap = new Map<string, WaterLog>();
  for (const wt of [...remote.waters, ...local.waters]) {
    const delTs = deletedIds[wt.id];
    if (delTs && delTs >= wt.createdAt) continue;
    waterMap.set(wt.id, wt);
  }
  const mergedWaters = Array.from(waterMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  // 合併印章
  const mergedStamps = Array.from(new Set([...(remote.stamps || []), ...(local.stamps || [])]));

  // 合併個人檔案與 Gemini API Key（以 settingsUpdatedAt 較新者為主，若一邊空白則保留非空白 Key）
  const localSettingsNewer = (local.settingsUpdatedAt || 0) >= (remote.settingsUpdatedAt || 0);
  const profile = localSettingsNewer ? local.profile : remote.profile;
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
    mergedWorkouts.length > 0;

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
    deletedIds,
  };
}

/**
 * 控制上傳雲端前的照片縮圖體積（僅保留最近 20 筆餐點的迷你縮圖，確保雲端永遠輕量秒傳）
 */
export function compactStateForCloud(state: VaultState): VaultState {
  const meals = state.meals.map((m, idx) => {
    if (idx < 20) return m;
    const { photoThumb: _omit, ...rest } = m;
    return rest;
  });
  return { ...state, meals };
}

/**
 * 寫入永久雲端 KV (textdb.online) — 嚴格使用 application/x-www-form-urlencoded + URLSearchParams
 */
export function buildTextDbFormBody(key: string, value: string): string {
  return new URLSearchParams({ key, value }).toString();
}

async function writeTextDbOnline(key: string, encryptedValue: string): Promise<boolean> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7500) : null;
  try {
    const body = buildTextDbFormBody(key, encryptedValue);
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctrl?.signal,
    };
    if (body.length < 55000) {
      init.keepalive = true;
    }
    const res = await fetch(TEXTDB_UPDATE_URL, init);
    return res.ok;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function writeTextDbDev(key: string, encryptedValue: string): Promise<boolean> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7500) : null;
  try {
    const bodyStr = JSON.stringify({ payload: encryptedValue });
    const init: RequestInit = {
      method: 'POST',
      // textdb.dev 嚴格要求 Content-Type: application/json
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      signal: ctrl?.signal,
    };
    if (bodyStr.length < 55000) {
      init.keepalive = true;
    }
    const res = await fetch(`${TEXTDB_DEV_API_URL}/${encodeURIComponent(key)}`, init);
    return res.ok;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function writePermanentCloud(key: string, encryptedValue: string): Promise<boolean> {
  const [okOnline, okDev] = await Promise.all([
    writeTextDbOnline(key, encryptedValue),
    writeTextDbDev(key, encryptedValue),
  ]);
  return okOnline || okDev;
}

async function readTextDbOnline(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6500) : null;
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

async function readTextDbDev(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6500) : null;
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

export async function readPermanentCloud(key: string): Promise<string | null> {
  const [onlineRaw, devRaw] = await Promise.all([
    readTextDbOnline(key),
    readTextDbDev(key),
  ]);
  return onlineRaw || devRaw || null;
}

async function readAllPermanentCloudCandidates(key: string): Promise<string[]> {
  const [onlineRaw, devRaw] = await Promise.all([
    readTextDbOnline(key),
    readTextDbDev(key),
  ]);
  return Array.from(new Set([onlineRaw, devRaw].filter((x): x is string => Boolean(x && x.startsWith('BC1:')))));
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
  errorMessage?: string;
}

/**
 * 標準雙向同步流程：永遠先從雙永久雲端 Pull 解密比對合併，再決定是否需要 Push！絕不拿空白預設洗掉雲端！
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
    const { vaultKey, sseTopic } = await deriveVaultIdentity(cleanPass);
    const rawCandidates = await readAllPermanentCloudCandidates(vaultKey);

    let merged = localState;
    let pulledFromCloud = false;
    let maxRemoteUpdatedAt = 0;

    for (const rawCloud of rawCandidates) {
      try {
        const decryptedJson = await decryptVaultPayload(rawCloud, cleanPass);
        const remoteState = parseVaultJson(decryptedJson);
        if (remoteState) {
          maxRemoteUpdatedAt = Math.max(maxRemoteUpdatedAt, remoteState.updatedAt || 0);
          merged = mergeVaultStates(merged, remoteState);
          pulledFromCloud = true;
        }
      } catch {
        // Ignore corrupted or wrong-passcode candidate if another candidate succeeds
      }
    }

    if (rawCandidates.length > 0 && !pulledFromCloud) {
      throw new Error('通行碼不正確，無法解開既有雲端加密紀錄');
    }

    // 與最新本機狀態再做一次防競態合併後存檔
    const latestLocalSync = loadLocalVaultSync();
    merged = mergeVaultStates(latestLocalSync, merged);
    await saveLocalVaultState(merged);

    // 只有當本機確實有已編輯內容且 (雲端尚無資料 / 本機較新 / 雙節點不一致 / 強制同步) 時才寫入雲端
    const shouldPush =
      !merged.isUneditedDefault &&
      merged.updatedAt > 0 &&
      (rawCandidates.length < 2 || merged.updatedAt > maxRemoteUpdatedAt || forcePushIfEdited);

    let pushedToCloud = false;
    if (shouldPush) {
      const compacted = compactStateForCloud(merged);
      const encrypted = await encryptVaultPayload(JSON.stringify(compacted), cleanPass);
      pushedToCloud = await writePermanentCloud(vaultKey, encrypted);
      if (pushedToCloud) {
        void pingSseTopic(sseTopic, merged.updatedAt);
      }
    }

    return {
      ok: true,
      mergedState: merged,
      pulledFromCloud,
      pushedToCloud,
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
    // 不在匯出 JSON 中意外暴露明文 API Key，使用者可自行保留或重貼
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
