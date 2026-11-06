import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Lock,
  KeyRound,
  User,
  Download,
  Upload,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Cloud,
  History,
} from 'lucide-react';
import {
  UserProfile,
  VaultState,
  ActivityLevel,
  GoalMode,
  calculateBmr,
  calculateTdee,
  calculateDailyCalorieBudget,
} from '../types/tracker';
import { testGeminiApiKey } from '../services/geminiService';
import {
  listLocalHistorySnapshots,
  LocalHistorySnapshot,
  parseVaultJson,
} from '../services/cloudSync';

interface Props {
  profile: UserProfile;
  geminiApiKey: string;
  activePasscode: string;
  fingerprintBadge?: string;
  hasUnsyncedChanges?: boolean;
  syncBusy: boolean;
  onUnlockOrChangePasscode: (newPasscode: string) => Promise<{ ok: boolean; msg: string }>;
  onSaveProfileAndKey: (nextProfile: UserProfile, nextApiKey: string) => void;
  onExportBackup: () => void;
  onImportBackup: (imported: Partial<VaultState>) => void;
  onClose: () => void;
}

function sanitizeDecimalInput(raw: string): string {
  const normalized = raw
    .replace(/[。．,]/g, '.')
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9.]/g, '');
  const firstDot = normalized.indexOf('.');
  if (firstDot === -1) return normalized;
  return normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '');
}

function sanitizeIntInput(raw: string): string {
  return raw
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, '');
}

export const SettingsVaultModal: React.FC<Props> = ({
  profile,
  geminiApiKey,
  activePasscode,
  fingerprintBadge,
  hasUnsyncedChanges,
  syncBusy,
  onUnlockOrChangePasscode,
  onSaveProfileAndKey,
  onExportBackup,
  onImportBackup,
  onClose,
}) => {
  const [passInput, setPassInput] = useState(activePasscode);
  const [showPasscode, setShowPasscode] = useState(false);
  const [passFeedback, setPassFeedback] = useState('');
  const [snapshots, setSnapshots] = useState<LocalHistorySnapshot[]>([]);
  const [snapshotFeedback, setSnapshotFeedback] = useState('');

  const [draftProfile, setDraftProfile] = useState<UserProfile>({ ...profile });
  const [ageInput, setAgeInput] = useState(() => String(profile.age));
  const [heightInput, setHeightInput] = useState(() => String(profile.heightCm));
  const [weightInput, setWeightInput] = useState(() => String(profile.weightKg));
  const [waterInput, setWaterInput] = useState(() => String(profile.dailyWaterTargetMl));
  const [customCalInput, setCustomCalInput] = useState(() =>
    String(profile.customDailyCalories || 1500)
  );

  const [draftKey, setDraftKey] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftProfile({ ...profile });
    setAgeInput(String(profile.age));
    setHeightInput(String(profile.heightCm));
    setWeightInput(String(profile.weightKg));
    setWaterInput(String(profile.dailyWaterTargetMl));
    setCustomCalInput(String(profile.customDailyCalories || 1500));
  }, [profile]);

  useEffect(() => {
    if (geminiApiKey) setDraftKey(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    setPassInput(activePasscode);
  }, [activePasscode]);

  useEffect(() => {
    let active = true;
    listLocalHistorySnapshots().then((list) => {
      if (active) setSnapshots(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const parsedAge = Number.parseInt(ageInput, 10);
  const parsedHeight = Number.parseFloat(heightInput);
  const parsedWeight = Number.parseFloat(weightInput);
  const parsedWater = Number.parseInt(waterInput, 10);
  const parsedCustomCal = Number.parseInt(customCalInput, 10);

  const effectiveProfile: UserProfile = {
    ...draftProfile,
    age: Number.isFinite(parsedAge) && parsedAge >= 10 && parsedAge <= 110 ? parsedAge : profile.age,
    heightCm:
      Number.isFinite(parsedHeight) && parsedHeight >= 100 && parsedHeight <= 230
        ? Math.round(parsedHeight * 10) / 10
        : profile.heightCm,
    weightKg:
      Number.isFinite(parsedWeight) && parsedWeight >= 25 && parsedWeight <= 250
        ? Math.round(parsedWeight * 10) / 10
        : profile.weightKg,
    dailyWaterTargetMl:
      Number.isFinite(parsedWater) && parsedWater >= 300 && parsedWater <= 6000
        ? parsedWater
        : profile.dailyWaterTargetMl,
    customDailyCalories:
      draftProfile.goalMode === 'custom'
        ? Number.isFinite(parsedCustomCal) && parsedCustomCal >= 800 && parsedCustomCal <= 5000
          ? parsedCustomCal
          : profile.customDailyCalories || 1500
        : draftProfile.customDailyCalories,
  };

  const previewBmr = calculateBmr(effectiveProfile);
  const previewTdee = calculateTdee(effectiveProfile);
  const previewBudget = calculateDailyCalorieBudget(effectiveProfile);

  const handlePasscodeAction = async () => {
    if (!passInput.trim()) {
      setPassFeedback('請輸入自訂通行碼喔');
      return;
    }
    const res = await onUnlockOrChangePasscode(passInput.trim());
    setPassFeedback(res.msg);
  };

  const handleTestKey = async () => {
    if (!draftKey.trim()) {
      setKeyFeedback('請先貼上 Gemini API Key 再測試喔');
      return;
    }
    setTestingKey(true);
    setKeyFeedback('');
    try {
      const ok = await testGeminiApiKey(draftKey);
      setKeyFeedback(
        ok
          ? '✅ 連線成功！矮袋鼠已經準備好幫妳拍照算熱量囉 ✨'
          : '❌ 驗證未通過，請確認是否完整複製 AIza 開頭的金鑰'
      );
    } catch {
      setKeyFeedback('❌ 網路連線失敗，請稍後再試');
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveAll = () => {
    onSaveProfileAndKey(effectiveProfile, draftKey.trim());
    onClose();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<VaultState>;
      onImportBackup(parsed);
    } catch {
      alert('備份檔格式無法讀取，請確認選擇正確的 .json 檔案喔');
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#422B1D]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#FFFDF9] sm:rounded-3xl rounded-t-3xl border-t-2 sm:border-2 border-[#DFC8AC] p-5 max-h-[92vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#422B1D]">⚙️ 個人檔案與雲端同步設定</h3>
            <p className="text-xs text-[#7C5841]">所有個人資料與金鑰皆於本機與前端加密，不公開於程式碼</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#FAF4EB] border border-[#DFC8AC] text-[#5C3F2D]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Cloud Sync Passcode */}
        <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E5CFB3] space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 font-black text-sm text-[#422B1D]">
              <Lock className="w-4 h-4 text-[#BA7E4D]" />
              <span>Safari ↔ iPhone「加入主畫面」加密同步通行碼</span>
            </div>
            {fingerprintBadge && (
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#DFC8AC] text-[11px] font-black text-[#5C3F2D]">
                雲端印記 {fingerprintBadge}
              </span>
            )}
          </div>
          <p className="text-xs text-[#7C5841] leading-relaxed">
            在 Safari 與主畫面 App 輸入<strong>同一組自訂通行碼</strong>（核對右上角<strong>雲端印記</strong>相同即代表兩邊已連上同一個加密保險箱！），所有飲食、清晰照片、喝水與 API Key 都會雙雲端永久同步！
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPasscode ? 'text' : 'password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="輸入妳自訂的專屬通行碼"
                className="w-full pl-3 pr-9 py-2 rounded-xl border border-[#DFC8AC] bg-white text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((s) => !s)}
                className="absolute right-2.5 top-2.5 text-[#7C5841]"
                title={showPasscode ? '隱藏通行碼' : '顯示通行碼確認無大小寫誤差'}
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              disabled={syncBusy}
              onClick={handlePasscodeAction}
              className="px-4 py-2 rounded-xl bg-[#BA7E4D] text-white font-bold text-xs doodle-btn flex items-center gap-1.5 shrink-0"
            >
              {syncBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
              綁定／同步
            </button>
          </div>
          {hasUnsyncedChanges && (
            <p className="text-[11px] font-bold text-[#9A5B13]">
              🟠 尚有最新紀錄排隊上傳雲端中（已安全保存在本機保險箱，網路恢復即自動對齊）
            </p>
          )}
          {passFeedback && <p className="text-xs font-bold text-[#355E30]">{passFeedback}</p>}
        </div>

        {/* 2. Gemini API Key */}
        <div className="p-4 rounded-2xl bg-[#FFF6E8] border border-[#ECD4B4] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-sm text-[#422B1D]">
              <KeyRound className="w-4 h-4 text-[#BA7E4D]" />
              <span>選填加速：自備 Gemini API Key（不填也能直接用！）</span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#BA7E4D] underline"
            >
              免費領取 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-[#7C5841]">
            ✅ <strong>系統已內建免金鑰雲端視覺與語意 AI</strong>，打開就能直接拍照或打字算熱量！若妳想切換成個人專屬高速 Gemini 通道，也可選填於此（前端加密同步、不公開於 GitHub）。
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="貼上 AIzaSy... 開頭的金鑰"
                className="w-full pl-3 pr-9 py-2 rounded-xl border border-[#DFC8AC] bg-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2.5 top-2 text-[#7C5841]"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              disabled={testingKey}
              onClick={handleTestKey}
              className="px-3 py-2 rounded-xl bg-white border border-[#422B1D] text-xs font-bold text-[#422B1D] shrink-0"
            >
              {testingKey ? '測試中...' : '測試連線'}
            </button>
          </div>
          {keyFeedback && <p className="text-xs font-bold text-[#5C3F2D]">{keyFeedback}</p>}
        </div>

        {/* 3. Personal Profile & Daily Calorie Budget */}
        <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E5CFB3] space-y-3">
          <div className="flex items-center gap-2 font-black text-sm text-[#422B1D]">
            <User className="w-4 h-4 text-[#8FBC8B]" />
            <span>個人小檔案（計算每日熱量預算＆運動消耗）</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">溫柔暱稱</label>
              <input
                type="text"
                value={draftProfile.nickname}
                onChange={(e) => setDraftProfile({ ...draftProfile, nickname: e.target.value })}
                placeholder="例如：Mona"
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">生理計算基準</label>
              <select
                value={draftProfile.gender}
                onChange={(e) =>
                  setDraftProfile({
                    ...draftProfile,
                    gender: e.target.value as 'female' | 'male',
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              >
                <option value="female">女生公式</option>
                <option value="male">男生公式</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">年齡</label>
              <input
                type="text"
                inputMode="numeric"
                value={ageInput}
                placeholder="例如：28"
                onChange={(e) => setAgeInput(sanitizeIntInput(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">身高 (cm)</label>
              <input
                type="text"
                inputMode="decimal"
                value={heightInput}
                placeholder="例如：160"
                onChange={(e) => setHeightInput(sanitizeDecimalInput(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">目前體重 (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                placeholder="例如：49.5"
                onChange={(e) => setWeightInput(sanitizeDecimalInput(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">日常活動量</label>
              <select
                value={draftProfile.activityLevel}
                onChange={(e) =>
                  setDraftProfile({
                    ...draftProfile,
                    activityLevel: e.target.value as ActivityLevel,
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              >
                <option value="sedentary">久坐辦公為主</option>
                <option value="light">輕度活動 (每週動1~3次)</option>
                <option value="moderate">中度活動 (每週動3~5次)</option>
                <option value="active">高度活動</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">飲食目標模式</label>
              <select
                value={draftProfile.goalMode}
                onChange={(e) =>
                  setDraftProfile({ ...draftProfile, goalMode: e.target.value as GoalMode })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              >
                <option value="gentle_cut">🌱 溫柔減脂 (TDEE - 300)</option>
                <option value="mini_cut">🌤️ 無痛微減 (TDEE - 150)</option>
                <option value="maintain">🍡 健康維持 (TDEE)</option>
                <option value="custom">✏️ 自訂每日大卡</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">
                每日喝水目標 (ml)
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={waterInput}
                  placeholder="1800"
                  onChange={(e) => setWaterInput(sanitizeIntInput(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const autoMl = Math.round((effectiveProfile.weightKg * 33) / 50) * 50;
                    setWaterInput(String(autoMl));
                  }}
                  className="px-2 py-1 rounded-xl bg-white border border-[#DFC8AC] text-[10px] font-bold whitespace-nowrap"
                >
                  自動算
                </button>
              </div>
            </div>
          </div>

          {draftProfile.goalMode === 'custom' && (
            <div>
              <label className="block text-[11px] font-bold text-[#7C5841] mb-1">
                自訂每日目標熱量 (kcal)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={customCalInput}
                placeholder="例如：1500"
                onChange={(e) => setCustomCalInput(sanitizeIntInput(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-[#DFC8AC] bg-white text-xs"
              />
            </div>
          )}

          {/* Live BMR/TDEE summary */}
          <div className="p-2.5 rounded-xl bg-white border border-[#EAD8C0] flex items-center justify-between text-xs">
            <span className="text-[#7C5841]">
              基代 {previewBmr} · 總消耗 TDEE {previewTdee}
            </span>
            <span className="font-black text-[#BA7E4D]">每日建議預算：{previewBudget} kcal</span>
          </div>
        </div>

        {/* 4. Rolling Local History Snapshots Rescue */}
        {snapshots.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#FAF4EB] border border-[#E5CFB3] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#422B1D]">
              <History className="w-3.5 h-3.5 text-[#BA7E4D]" />
              <span>🛟 本機自動防誤刪歷史快照救援（僅合併補回、不覆蓋新資料）</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {snapshots.slice(0, 5).map((snap) => {
                const dtStr = new Date(snap.savedAt).toLocaleString('zh-TW', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-[#EAD8C0] text-[11px]"
                  >
                    <span className="text-[#5C3F2D] font-semibold">
                      {dtStr} · 🍽️{snap.mealCount} 餐 / 💧{snap.waterCount} 水 / 🔥{snap.workoutCount} 運動
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseVaultJson(snap.stateJson);
                        if (parsed) {
                          // Clear deletedIds from snapshot rescue so accidentally deleted items come back cleanly
                          onImportBackup({ ...parsed, deletedIds: {} });
                          setSnapshotFeedback(`✅ 已無損合併救回 ${dtStr} 的快照紀錄！`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#FFF6E8] border border-[#DFC8AC] font-bold text-[#BA7E4D] shrink-0"
                    >
                      合併救回
                    </button>
                  </div>
                );
              })}
            </div>
            {snapshotFeedback && (
              <p className="text-xs font-bold text-[#355E30]">{snapshotFeedback}</p>
            )}
          </div>
        )}

        {/* 5. Backup & Restore */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExportBackup}
            className="flex-1 py-2.5 rounded-xl bg-[#FAF4EB] border border-[#DFC8AC] text-xs font-bold text-[#5C3F2D] flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> 下載 .json 備份檔
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 rounded-xl bg-[#FAF4EB] border border-[#DFC8AC] text-xs font-bold text-[#5C3F2D] flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> 匯入 .json 備份檔
          </button>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="w-full py-3.5 rounded-2xl bg-[#8FBC8B] text-white font-black text-sm doodle-btn flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          儲存個人設定並自動加密同步
        </button>
      </div>
    </div>
  );
};
