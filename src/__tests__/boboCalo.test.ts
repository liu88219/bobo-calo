import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
} from '../services/cryptoVault';
import {
  mergeVaultStates,
  buildTextDbFormBody,
  loadLocalVaultSync,
  saveLocalVaultState,
  syncWithCloudVault,
  writePermanentCloud,
  readPermanentCloud,
} from '../services/cloudSync';
import {
  createInitialVaultState,
  calculateDailyCalorieBudget,
  calculateExerciseCalories,
  DEFAULT_PROFILE,
} from '../types/tracker';
import {
  buildMealChallengePlaylist,
  buildDailyCalorieTargetPlan,
  matchCompletedPlanItems,
  getExerciseById,
} from '../data/exercises';
import {
  parseGeminiNutritionJson,
  parseTaiwanNutritionLabelText,
  recalculateMealFromEdits,
} from '../services/geminiService';
import { TAIWAN_FOOD_PRESETS } from '../data/taiwanFoods';

describe('BoboCalo Security, Cloud Sync & Calorie Engine', () => {
  it('derives identical deterministic vaultKey across Safari and Standalone PWA for same passcode', async () => {
    const a = await deriveVaultIdentity('  my-marsh-secret  ');
    const b = await deriveVaultIdentity('my-marsh-secret');
    const c = await deriveVaultIdentity('another-passcode');
    expect(a.vaultKey).toBe(b.vaultKey);
    expect(a.sseTopic).toBe(b.sseTopic);
    expect(a.vaultKey).not.toBe(c.vaultKey);
  });

  it('encrypts and decrypts VaultState with PBKDF2 + AES-GCM and preserves + via URLSearchParams', async () => {
    const sample = createInitialVaultState();
    sample.isUneditedDefault = false;
    sample.updatedAt = 1700000000000;
    sample.geminiApiKey = 'AIzaTestDummyKey_NotARealSecret';
    sample.profile.nickname = 'Mona';

    const cipher = await encryptVaultPayload(JSON.stringify(sample), 'quokka-test-pass');
    expect(cipher.startsWith('BC2:')).toBe(true);
    expect(cipher).not.toContain('AIzaTestDummyKey');

    // Verify URLSearchParams properly percent-encodes '+' if present
    const formBody = buildTextDbFormBody('test_key', `${cipher}+extra`);
    expect(formBody).toContain('%2Bextra');

    const plain = await decryptVaultPayload(cipher, 'quokka-test-pass');
    const restored = JSON.parse(plain);
    expect(restored.geminiApiKey).toBe('AIzaTestDummyKey_NotARealSecret');
    expect(restored.profile.nickname).toBe('Mona');
  });

  it('prevents unedited default state from overwriting cloud edited state and respects tombstones', () => {
    const blankLocal = createInitialVaultState();
    const remoteEdited = createInitialVaultState();
    remoteEdited.isUneditedDefault = false;
    remoteEdited.updatedAt = 5000;
    remoteEdited.meals = [
      {
        id: 'm-1',
        dateKey: '2026-11-06',
        category: 'lunch',
        title: '香煎雞腿便當',
        items: [],
        totalCalories: 720,
        proteinG: 32,
        carbsG: 80,
        fatG: 28,
        praise: '超棒！',
        createdAt: 4000,
        updatedAt: 4000,
      },
    ];

    const mergedFromBlank = mergeVaultStates(blankLocal, remoteEdited);
    expect(mergedFromBlank.isUneditedDefault).toBe(false);
    expect(mergedFromBlank.meals).toHaveLength(1);

    // Tombstone deletion on another device must prevent resurrection
    const localWithDelete = {
      ...mergedFromBlank,
      updatedAt: 6000,
      meals: [],
      deletedIds: { 'm-1': 6000 },
    };
    const mergedAfterDelete = mergeVaultStates(localWithDelete, remoteEdited);
    expect(mergedAfterDelete.meals).toHaveLength(0);
    expect(mergedAfterDelete.deletedIds['m-1']).toBe(6000);
  });

  it('calculates daily calorie budget, MET burn, and meal challenge playlists accurately', () => {
    const budget = calculateDailyCalorieBudget(DEFAULT_PROFILE);
    expect(budget).toBeGreaterThan(1100);
    expect(budget).toBeLessThan(2000);

    const jogKcal = calculateExerciseCalories(6.0, 54, 600); // 10 min slow jogging
    expect(jogKcal).toBeGreaterThan(50);

    const gentleCombo = buildMealChallengePlaylist(640, 54, 'gentle_25');
    expect(gentleCombo.targetCalories).toBe(160);
    expect(gentleCombo.items.length).toBeGreaterThanOrEqual(3);
    expect(gentleCombo.items.every((i) => i.durationSec <= 240)).toBe(true);

    const quick4Min = buildMealChallengePlaylist(500, 54, 'quick_4min_arm_bed');
    const totalQuickSec = quick4Min.items.reduce((s, i) => s + i.durationSec, 0);
    expect(totalQuickSec).toBe(240);
  });

  it('parses Gemini nutrition JSON fenced output cleanly', () => {
    const raw = `\`\`\`json
{
  "title": "起司蛋餅＋無糖豆漿",
  "items": [
    { "name": "起司蛋餅", "portion": "1份", "calories": 340, "proteinG": 13, "carbsG": 29, "fatG": 18 },
    { "name": "無糖豆漿", "portion": "400ml", "calories": 135, "proteinG": 13, "carbsG": 6, "fatG": 6 }
  ],
  "praise": "早安～有好好吃蛋白質超棒喔 🤎"
}
\`\`\``;
    const parsed = parseGeminiNutritionJson(raw, 'breakfast');
    expect(parsed.totalCalories).toBe(475);
    expect(parsed.proteinG).toBe(26);
    expect(parsed.items).toHaveLength(2);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('recalculates calories strictly from user-edited dish names, portions, and correction notes', async () => {
    await expect(
      recalculateMealFromEdits({
        category: 'lunch',
        editedItems: [{ name: '   ', portion: '1份' }],
        correctionNote: '',
      })
    ).rejects.toThrow();

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '香煎板豆腐＋半碗糙米飯',
                  items: [
                    { name: '香煎板豆腐', portion: '1塊', calories: 165, proteinG: 14, carbsG: 4, fatG: 10 },
                    { name: '糙米飯', portion: '半碗', calories: 140, proteinG: 3, carbsG: 30, fatG: 1 },
                  ],
                  praise: '修正後更準確囉！植物性蛋白質超棒 🤎',
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await recalculateMealFromEdits({
      category: 'lunch',
      editedItems: [
        { name: '香煎板豆腐', portion: '1塊' },
        { name: '糙米飯', portion: '半碗' },
      ],
      correctionNote: '少油乾煎，不是炸豬排',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const bodySent = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body || '{}'));
    const userPrompt = bodySent?.messages?.[1]?.content || '';
    expect(userPrompt).toContain('香煎板豆腐');
    expect(userPrompt).toContain('半碗');
    expect(userPrompt).toContain('少油乾煎，不是炸豬排');
    expect(res.totalCalories).toBe(305);
    expect(res.items).toHaveLength(2);
  });

  it('propagates edited and recalculated MealLog across devices using updatedAt without duplicating', () => {
    const olderDevice = createInitialVaultState();
    olderDevice.isUneditedDefault = false;
    olderDevice.updatedAt = 5000;
    olderDevice.meals = [
      {
        id: 'meal-edit-1',
        dateKey: '2026-11-06',
        category: 'dinner',
        title: '炸豬排便當',
        items: [{ id: 'i-1', name: '炸豬排', portion: '1份', calories: 520, proteinG: 25, carbsG: 30, fatG: 32 }],
        totalCalories: 520,
        proteinG: 25,
        carbsG: 30,
        fatG: 32,
        photoThumb: 'data:image/jpeg;base64,thumbdata',
        praise: '吃飽飽！',
        createdAt: 5000,
        updatedAt: 5000,
      },
    ];

    const editedDevice = createInitialVaultState();
    editedDevice.isUneditedDefault = false;
    editedDevice.updatedAt = 9000;
    editedDevice.meals = [
      {
        ...olderDevice.meals[0],
        title: '香煎板豆腐便當',
        items: [{ id: 'i-2', name: '香煎板豆腐', portion: '1份', calories: 180, proteinG: 16, carbsG: 5, fatG: 11 }],
        totalCalories: 180,
        proteinG: 16,
        carbsG: 5,
        fatG: 11,
        updatedAt: 9000,
      },
    ];

    const merged = mergeVaultStates(olderDevice, editedDevice);
    expect(merged.meals).toHaveLength(1);
    expect(merged.meals[0].title).toBe('香煎板豆腐便當');
    expect(merged.meals[0].totalCalories).toBe(180);
    expect(merged.meals[0].photoThumb).toBe('data:image/jpeg;base64,thumbdata');
  });

  it('guards localStorage against accidental blank overwrite and recovers from rolling non-empty snapshot', async () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
      removeItem: (k: string) => mem.delete(k),
    });

    const active = createInitialVaultState();
    active.isUneditedDefault = false;
    active.updatedAt = 12345;
    active.profile.weightKg = 49.5;
    active.meals = [
      {
        id: 'meal-today-1',
        dateKey: '2026-11-06',
        category: 'lunch',
        title: '健康雞胸餐盒',
        items: [{ id: 'i1', name: '舒肥雞胸', portion: '1份', calories: 220, proteinG: 35, carbsG: 2, fatG: 5 }],
        totalCalories: 220,
        proteinG: 35,
        carbsG: 2,
        fatG: 5,
        praise: '超棒！',
        createdAt: 12345,
        updatedAt: 12345,
      },
    ];

    await saveLocalVaultState(active);
    // Attempting to save an unedited blank default state must NEVER wipe existing records
    await saveLocalVaultState(createInitialVaultState());

    const loaded = loadLocalVaultSync();
    expect(loaded.meals).toHaveLength(1);
    expect(loaded.meals[0].title).toBe('健康雞胸餐盒');
    expect(loaded.profile.weightKg).toBe(49.5);

    // Even if primary key were accidentally cleared, rolling non-empty snapshot restores it
    mem.delete('bobocalo_state_v1');
    const recovered = loadLocalVaultSync();
    expect(recovered.meals).toHaveLength(1);
    expect(recovered.meals[0].id).toBe('meal-today-1');
  });

  it('rejects textdb.online HTTP 200 status:0 false positives, chunks >40KB payloads, and rescues iOS case-shifted passcodes', async () => {
    const cloudKv = new Map<string, string>();
    let activeBrowserStorage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => activeBrowserStorage.get(k) ?? null,
      setItem: (k: string, v: string) => activeBrowserStorage.set(k, v),
      removeItem: (k: string) => activeBrowserStorage.delete(k),
    });

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('api.textdb.online/update/')) {
        const params = new URLSearchParams(String(init?.body || ''));
        const k = params.get('key') || '';
        const v = params.get('value') || '';
        if (v.length > 200000) {
          return new Response(JSON.stringify({ status: 0, error: '内容最多20万字符' }), { status: 200 });
        }
        cloudKv.set(`online:${k}`, v);
        return new Response(JSON.stringify({ status: 1 }), { status: 200 });
      }
      if (url.includes('textdb.online/')) {
        const keyPart = decodeURIComponent(url.split('textdb.online/')[1].split('?')[0]);
        return new Response(cloudKv.get(`online:${keyPart}`) || '', { status: 200 });
      }
      if (url.includes('textdb.dev/api/data/')) {
        const keyPart = decodeURIComponent(url.split('textdb.dev/api/data/')[1].split('?')[0]);
        if (init?.method === 'POST') {
          const parsed = JSON.parse(String(init.body || '{}'));
          cloudKv.set(`dev:${keyPart}`, parsed.payload || '');
          return new Response(JSON.stringify(parsed), { status: 200 });
        }
        const saved = cloudKv.get(`dev:${keyPart}`);
        return new Response(saved ? JSON.stringify({ payload: saved }) : '', { status: 200 });
      }
      return new Response('', { status: 200 });
    }));

    // 1. Test multi-chunk cloud write & read for >95KB payload
    const largePayload = `BC2:${'A'.repeat(95000)}`;
    const wrote = await writePermanentCloud('test_chunk_key', largePayload);
    expect(wrote).toBe(true);
    expect(cloudKv.get('online:test_chunk_key')?.startsWith('BCCHUNK1:3:')).toBe(true);
    const readBack = await readPermanentCloud('test_chunk_key');
    expect(readBack).toBe(largePayload);

    // 2. Test Safari pushes with 'MonaSecret88' (iOS Shift capitalized) and Home Screen pulls with 'monasecret88'
    const safariState = createInitialVaultState();
    safariState.isUneditedDefault = false;
    safariState.updatedAt = 88888;
    safariState.meals = [
      {
        id: 'meal-sync-rescue-1',
        dateKey: '2026-11-06',
        category: 'dinner',
        title: '鮭魚酪梨波奇碗',
        items: [{ id: 'f1', name: '鮭魚波奇碗', portion: '1碗', calories: 560, proteinG: 32, carbsG: 55, fatG: 22 }],
        totalCalories: 560,
        proteinG: 32,
        carbsG: 55,
        fatG: 22,
        praise: '超營養！',
        createdAt: 88888,
        updatedAt: 88888,
      },
    ];
    const pushOutcome = await syncWithCloudVault(safariState, 'MonaSecret88', true);
    expect(pushOutcome.ok).toBe(true);
    expect(pushOutcome.pushedToCloud).toBe(true);

    // Simulate isolated iPhone Home Screen standalone sandbox (fresh empty localStorage!)
    activeBrowserStorage = new Map<string, string>();
    const homeScreenBlank = createInitialVaultState();
    const pullOutcome = await syncWithCloudVault(homeScreenBlank, 'monaSecret88', false);
    expect(pullOutcome.ok).toBe(true);
    expect(pullOutcome.pulledFromCloud).toBe(true);
    expect(pullOutcome.matchedPasscode).toBe('MonaSecret88');
    expect(pullOutcome.mergedState.meals).toHaveLength(1);
    expect(pullOutcome.mergedState.meals[0].title).toBe('鮭魚酪梨波奇碗');
  });

  it('formulates daily target-calorie workout checklist accurately and tracks item completions', () => {
    const plan80 = buildDailyCalorieTargetPlan(80, 54, 0);
    expect(plan80.length).toBeGreaterThanOrEqual(3);
    expect(plan80.every((it) => it.durationSec >= 45 && it.durationSec <= 240)).toBe(true);

    const total80 = plan80.reduce(
      (sum, it) => sum + calculateExerciseCalories(getExerciseById(it.exerciseId).met, 54, it.durationSec),
      0
    );
    expect(Math.abs(total80 - 80)).toBeLessThanOrEqual(5);

    const shuffledPlan = buildDailyCalorieTargetPlan(80, 54, 1);
    expect(shuffledPlan[0].exerciseId).not.toBe(plan80[0].exerciseId);

    // Match completed items via planItemId AND via standalone exerciseId fallback
    const matched = matchCompletedPlanItems(plan80, [
      {
        id: 'wo-1',
        dateKey: '2026-11-09',
        exerciseId: plan80[0].exerciseId,
        exerciseName: 'Item 1',
        durationSec: plan80[0].durationSec,
        caloriesBurned: 15,
        planItemId: plan80[0].id,
        createdAt: 1000,
      },
      {
        id: 'wo-2',
        dateKey: '2026-11-09',
        exerciseId: plan80[1].exerciseId,
        exerciseName: 'Item 2 from gallery',
        durationSec: 240,
        caloriesBurned: 16,
        createdAt: 2000,
      },
    ]);
    expect(matched[plan80[0].id]?.id).toBe('wo-1');
    expect(matched[plan80[1].id]?.id).toBe('wo-2');
    expect(matched[plan80[2].id]).toBeUndefined();
  });

  it('parses back-of-package Taiwan Nutrition Facts labels even when front product title is missing', () => {
    const snackBackOcr = `
      成分：燕麥片、杏仁果、蔓越莓乾、蜂蜜
      營養標示
      每一份量 45 公克
      本包裝含 1 份
      每份
      熱量 193 大卡
      蛋白質 5.4 公克
      脂肪 6.8 公克
      飽和脂肪 1.1 公克
      碳水化合物 27.6 公克
    `;
    const snackParsed = parseTaiwanNutritionLabelText(snackBackOcr, undefined, 'snack');
    expect(snackParsed).not.toBeNull();
    expect(snackParsed!.totalCalories).toBe(193);
    expect(snackParsed!.proteinG).toBe(5.4);
    expect(snackParsed!.fatG).toBe(6.8);
    expect(snackParsed!.carbsG).toBe(27.6);
    expect(snackParsed!.title).toContain('燕麥片杏仁果');

    const bottleSoyOcr = `
      品名：濃厚無加糖黑豆漿
      營養標示
      每一份量 200 毫升
      本包裝含 2 份
      熱量 106 大卡
      蛋白質 10.4 公克
      脂肪 4.6 公克
      碳水化合物 5.8 公克
    `;
    const bottleParsed = parseTaiwanNutritionLabelText(bottleSoyOcr, undefined, 'breakfast');
    expect(bottleParsed).not.toBeNull();
    expect(bottleParsed!.title).toBe('濃厚無加糖黑豆漿');
    expect(bottleParsed!.totalCalories).toBe(212);
    expect(bottleParsed!.proteinG).toBe(20.8);
  });

  it('includes comprehensive Taiwanese company cafeteria / buffet dishes while preserving all original presets', () => {
    const buffetItems = TAIWAN_FOOD_PRESETS.filter((p) => p.group === '自助餐夾菜');
    expect(buffetItems.length).toBeGreaterThanOrEqual(50);
    expect(buffetItems.some((p) => p.buffetSub === 'staple')).toBe(true);
    expect(buffetItems.some((p) => p.buffetSub === 'main')).toBe(true);
    expect(buffetItems.some((p) => p.buffetSub === 'egg_tofu')).toBe(true);
    expect(buffetItems.some((p) => p.buffetSub === 'veggie')).toBe(true);
    // Original presets preserved
    expect(TAIWAN_FOOD_PRESETS.some((p) => p.id === 'tw-bf-1')).toBe(true);
    expect(TAIWAN_FOOD_PRESETS.some((p) => p.id === 'tw-bt-1')).toBe(true);
    expect(TAIWAN_FOOD_PRESETS.some((p) => p.id === 'tw-fr-4')).toBe(true);
  });
});
