
export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export enum Goal {
  LOSE_WEIGHT = 'Lose Weight',
  MAINTAIN = 'Maintain',
  GAIN_WEIGHT = 'Gain Weight',
}

export enum MuscleGroup {
  CHEST = 'Chest',
  BACK = 'Back',
  SHOULDERS = 'Shoulders',
  ARMS = 'Arms',
  LEGS = 'Legs',
  GLUTES = 'Glutes',
  ABS_CORE = 'Abs/Core',
}

export enum WorkoutLocation {
  HOME = 'Home',
  GYM = 'Gym',
}

export interface ProgressPhoto {
  id: string;
  imageUrl: string;
  date: string;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  height: number;
  weight: number;
  targetWeight: number;
  durationWeeks: number;
  goal: Goal;
  workoutLocation?: WorkoutLocation; 
  isOnboarded: boolean;
  progressPhotos?: ProgressPhoto[];
  isPremium?: boolean;
  dailyWaterGoal?: number;
  scansUsedToday?: number;
  lastScanResetDate?: string;
  upiId?: string;
  points?: number;
  referralCode: string;
  referredBy?: string; 
  hasClaimedSignupReferral?: boolean;
  currentStreak?: number;
  lastLoginDate?: string;
  uniqueTransferCode?: string;
  email?: string;
  isDisabled?: boolean;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface FoodAnalysis {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthScore: number;
  microAnalysis: string;
  timestamp: string;
  imageUrl?: string;
  mealType: MealType;
  alternatives: string[];
}

export interface ScanHistoryItem extends FoodAnalysis {
  id: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  description: string;
  imageUrl: string;
  location: WorkoutLocation;
  muscleGroups: MuscleGroup[];
}
