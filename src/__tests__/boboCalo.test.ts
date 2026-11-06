import { describe, it, expect } from 'vitest';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
} from '../services/cryptoVault';
import {
  mergeVaultStates,
  buildTextDbFormBody,
} from '../services/cloudSync';
import {
  createInitialVaultState,
  calculateDailyCalorieBudget,
  calculateExerciseCalories,
  DEFAULT_PROFILE,
} from '../types/tracker';
import { buildMealChallengePlaylist } from '../data/exercises';
import { parseGeminiNutritionJson } from '../services/geminiService';

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
    expect(cipher.startsWith('BC1:')).toBe(true);
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
});
