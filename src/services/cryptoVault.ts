import LZString from 'lz-string';

export interface DerivedVaultIdentity {
  passHashHex: string;
  vaultKey: string;
  sseTopic: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function normalizePasscode(raw: string): string {
  return raw.trim();
}

/**
 * 確定性衍生跨瀏覽器一致的雲端鍵值（Safari ↔ iPhone 加入主畫面 ↔ LINE 內建瀏覽器輸入同一通行碼必對齊同一通道）
 */
export async function deriveVaultIdentity(passcode: string): Promise<DerivedVaultIdentity> {
  const normalized = normalizePasscode(passcode);
  if (!normalized) {
    throw new Error('請輸入通行碼');
  }
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(`bobo_calo_vault_v1:${normalized}`)
  );
  const fullHex = bytesToHex(new Uint8Array(hashBuf));
  const keySlice = fullHex.slice(0, 32);
  const sseSlice = fullHex.slice(32, 56);
  return {
    passHashHex: fullHex,
    vaultKey: `bobocalo_perm_v1_${keySlice}`,
    sseTopic: `bobocalo_sse_v1_${sseSlice}`,
  };
}

async function deriveAesKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(`bobo_calo_aes_v1:${normalizePasscode(passcode)}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 60000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 先以 LZString 壓縮 JSON，再以 PBKDF2 + AES-GCM 前端加密（確保 Gemini API Key 與個人紀錄在公開雲端 KV 完全不可讀）
 */
export async function encryptVaultPayload(plainJson: string, passcode: string): Promise<string> {
  const compressed = LZString.compressToUTF16(plainJson);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(passcode, salt);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(compressed)
  );
  const envelope = {
    v: 1,
    s: bytesToBase64(salt),
    i: bytesToBase64(iv),
    c: bytesToBase64(new Uint8Array(cipherBuf)),
  };
  return `BC1:${btoa(JSON.stringify(envelope))}`;
}

export async function decryptVaultPayload(payload: string, passcode: string): Promise<string> {
  const trimmed = payload.trim();
  if (!trimmed.startsWith('BC1:')) {
    throw new Error('無效的雲端加密格式');
  }
  const envelopeJson = atob(trimmed.slice(4));
  const envelope = JSON.parse(envelopeJson) as { v: number; s: string; i: string; c: string };
  const salt = base64ToBytes(envelope.s);
  const iv = base64ToBytes(envelope.i);
  const cipherBytes = base64ToBytes(envelope.c);
  const aesKey = await deriveAesKey(passcode, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    cipherBytes as BufferSource
  );
  const dec = new TextDecoder();
  const compressed = dec.decode(plainBuf);
  const decompressed = LZString.decompressFromUTF16(compressed);
  if (!decompressed) {
    throw new Error('解壓縮雲端資料失敗');
  }
  return decompressed;
}
