import {
  VaultState,
  MealLog,
  WorkoutLog,
  WaterLog,
  createInitialVaultState,
} from '../types/tracker';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
  normalizePasscode,
} from './cryptoVault';

const LOCAL_STATE_KEY = 'bobocalo_state_v1';
const LOCAL_PASSCODE_KEY = 'bobocalo_saved_passcode_v1';
const TEXTDB_UPDATE_URL = 'https://api.textdb.online/update/';
const TEXTDB_READ_URL = 'https://textdb.online';
const NTFY_BASE_URL = 'https://ntfy.sh';

const IDB_NAME = 'BoboCaloDB';
const IDB_KV_STORE = 'kv';
const IDB_PHOTO_STORE = 'meal_photos';
const IDB_STATE_KEY = 'vault_state_v1';
const IDB_PASS_KEY = 'saved_passcode_v1';

/**
 * 申請瀏覽器永久儲存權限，避免 iOS / 行動瀏覽器自動回收空間
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // Ignore unsupported environments
  }
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
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
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(storeName: string, key: string, value: string): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  return new Promise((resolve) => {
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
    } catch {
      db.close();
      resolve();
    }
  });
}

async function idbGet(storeName: string, key: string): Promise<string | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
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
}

export async function saveLocalHiResPhoto(mealId: string, dataUrl: string): Promise<void> {
  await idbPut(IDB_PHOTO_STORE, mealId, dataUrl);
}

export async function getLocalHiResPhoto(mealId: string): Promise<string | null> {
  return idbGet(IDB_PHOTO_STORE, mealId);
}

export async function saveLocalVaultState(state: VaultState): Promise<void> {
  const raw = JSON.stringify(state);
  try {
    localStorage.setItem(LOCAL_STATE_KEY, raw);
  } catch {
    // Quota or private mode fallback to IndexedDB
  }
  await idbPut(IDB_KV_STORE, IDB_STATE_KEY, raw);
}

export async function loadLocalVaultState(): Promise<VaultState> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOCAL_STATE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    // 若 localStorage 被內建瀏覽器清空，自動從 IndexedDB 無縫救回
    raw = await idbGet(IDB_KV_STORE, IDB_STATE_KEY);
    if (raw) {
      try {
        localStorage.setItem(LOCAL_STATE_KEY, raw);
      } catch {
        // Ignore
      }
    }
  }
  if (!raw) {
    return createInitialVaultState();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<VaultState>;
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
    return createInitialVaultState();
  }
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
  let saved = '';
  try {
    saved = localStorage.getItem(LOCAL_PASSCODE_KEY) || '';
  } catch {
    saved = '';
  }
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
  const hasAnyEdit = !local.isUneditedDefault || !remote.isUneditedDefault || maxUpdatedAt > 0;

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
 * 控制上傳雲端前的照片縮圖體積（僅保留最近 20 筆餐點的迷你縮圖，確保 textdb 永遠輕量秒傳）
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

export async function writePermanentCloud(key: string, encryptedValue: string): Promise<boolean> {
  try {
    const body = buildTextDbFormBody(key, encryptedValue);
    const res = await fetch(TEXTDB_UPDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function readPermanentCloud(key: string): Promise<string | null> {
  try {
    const url = `${TEXTDB_READ_URL}/${encodeURIComponent(key)}?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text || null;
  } catch {
    return null;
  }
}

async function pingSseTopic(sseTopic: string, updatedAt: number): Promise<void> {
  try {
    await fetch(`${NTFY_BASE_URL}/${encodeURIComponent(sseTopic)}`, {
      method: 'POST',
      body: JSON.stringify({ t: updatedAt }),
    });
  } catch {
    // Optional realtime relay; permanent truth is always textdb.online
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
 * 標準雙向同步流程：永遠先 Pull 雲端解密比對合併，再決定是否需要 Push！絕不拿空白預設洗掉雲端！
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
    const rawCloud = await readPermanentCloud(vaultKey);

    let merged = localState;
    let pulledFromCloud = false;
    let remoteUpdatedAt = 0;

    if (rawCloud && rawCloud.startsWith('BC1:')) {
      const decryptedJson = await decryptVaultPayload(rawCloud, cleanPass);
      const remoteState = JSON.parse(decryptedJson) as VaultState;
      remoteUpdatedAt = remoteState.updatedAt || 0;
      merged = mergeVaultStates(localState, remoteState);
      pulledFromCloud = true;
    }

    await saveLocalVaultState(merged);

    // 只有當本機確實有已編輯內容且 (雲端尚無資料 / 本機較新 / 強制同步) 時才寫入雲端
    const shouldPush =
      !merged.isUneditedDefault &&
      merged.updatedAt > 0 &&
      (!rawCloud || merged.updatedAt > remoteUpdatedAt || forcePushIfEdited);

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
