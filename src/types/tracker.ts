export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type GoalMode = 'gentle_cut' | 'mini_cut' | 'maintain' | 'custom';

export interface UserProfile {
  nickname: string;
  gender: 'female' | 'male';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalMode: GoalMode;
  customDailyCalories?: number;
  dailyWaterTargetMl: number;
}

export interface MealFoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealLog {
  id: string;
  dateKey: string; // YYYY-MM-DD
  category: MealCategory;
  title: string;
  items: MealFoodItem[];
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  photoThumb?: string; // Compact 112x112 data URL synced to cloud
  hasLocalHiResPhoto?: boolean; // Stored in IndexedDB meal_photos
  note?: string;
  praise: string;
  createdAt: number;
  updatedAt: number;
}

export type ExerciseCategory = 'silent_home' | 'post_meal_yoga';

export interface ExerciseDefinition {
  id: string;
  name: string;
  subtitle: string;
  category: ExerciseCategory;
  met: number;
  defaultDurationSec: number;
  hasMetronome180?: boolean;
  steps: string[];
  breathingTip: string;
  quokkaCheer: string;
  tags: string[];
}

export interface WorkoutPlaylistItem {
  exerciseId: string;
  durationSec: number;
}

export interface WorkoutLog {
  id: string;
  dateKey: string;
  exerciseId: string;
  exerciseName: string;
  durationSec: number;
  caloriesBurned: number;
  sourceMealId?: string;
  createdAt: number;
}

export interface WaterLog {
  id: string;
  dateKey: string;
  amountMl: number;
  label: string;
  createdAt: number;
}

export interface VaultState {
  version: 1;
  updatedAt: number;
  settingsUpdatedAt: number;
  isUneditedDefault: boolean;
  profile: UserProfile;
  geminiApiKey: string;
  meals: MealLog[];
  workouts: WorkoutLog[];
  waters: WaterLog[];
  stamps: string[]; // dateKeys or unique stamp IDs earned
  deletedIds: Record<string, number>;
}

export const DEFAULT_PROFILE: UserProfile = {
  nickname: '',
  gender: 'female',
  age: 28,
  heightCm: 160,
  weightKg: 54,
  activityLevel: 'light',
  goalMode: 'gentle_cut',
  dailyWaterTargetMl: 1800,
};

export function createInitialVaultState(): VaultState {
  return {
    version: 1,
    updatedAt: 0, // Must be 0 for anti-overwrite protection!
    settingsUpdatedAt: 0,
    isUneditedDefault: true,
    profile: { ...DEFAULT_PROFILE },
    geminiApiKey: '',
    meals: [],
    workouts: [],
    waters: [],
    stamps: [],
    deletedIds: {},
  };
}

export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateBmr(profile: UserProfile): number {
  const base =
    10 * Math.max(30, profile.weightKg) +
    6.25 * Math.max(120, profile.heightCm) -
    5 * Math.max(14, profile.age);
  return Math.round(profile.gender === 'female' ? base - 161 : base + 5);
}

export function calculateTdee(profile: UserProfile): number {
  const bmr = calculateBmr(profile);
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  return Math.round(bmr * (multipliers[profile.activityLevel] || 1.375));
}

export function calculateDailyCalorieBudget(profile: UserProfile): number {
  if (profile.goalMode === 'custom' && profile.customDailyCalories && profile.customDailyCalories >= 1000) {
    return Math.round(profile.customDailyCalories);
  }
  const tdee = calculateTdee(profile);
  const bmr = calculateBmr(profile);
  if (profile.goalMode === 'gentle_cut') {
    return Math.max(bmr, tdee - 300);
  }
  if (profile.goalMode === 'mini_cut') {
    return Math.max(bmr, tdee - 150);
  }
  return tdee;
}

/**
 * MET calorie formula: kcal = MET * weightKg * (durationSec / 3600) * 1.05
 */
export function calculateExerciseCalories(met: number, weightKg: number, durationSec: number): number {
  const safeWeight = Math.max(35, weightKg || 54);
  const hours = Math.max(0, durationSec) / 3600;
  return Math.max(1, Math.round(met * safeWeight * hours * 1.05));
}

export function calculateSecondsForTargetCalories(met: number, weightKg: number, targetCalories: number): number {
  const safeWeight = Math.max(35, weightKg || 54);
  const kcalPerHour = met * safeWeight * 1.05;
  if (kcalPerHour <= 0) return 60;
  const rawSec = Math.round((Math.max(5, targetCalories) / kcalPerHour) * 3600);
  // Round neatly to nearest 15 seconds, minimum 30s
  return Math.max(30, Math.round(rawSec / 15) * 15);
}

export const MEAL_CATEGORY_META: Record<
  MealCategory,
  { label: string; emoji: string; badgeBg: string }
> = {
  breakfast: { label: '早餐時光', emoji: '🥐', badgeBg: 'bg-[#FDECC8] text-[#7A5116]' },
  lunch: { label: '午餐補給', emoji: '🍱', badgeBg: 'bg-[#E3F1DF] text-[#355E30]' },
  dinner: { label: '晚餐療癒', emoji: '🍲', badgeBg: 'bg-[#FCE1DC] text-[#7D362B]' },
  snack: { label: '點心／手搖', emoji: '🧋', badgeBg: 'bg-[#EDE3F5] text-[#53386E]' },
};
