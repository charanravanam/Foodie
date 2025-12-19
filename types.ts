
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

export enum WorkoutGoal {
  BELLY_FAT = 'Lower Belly Fat',
  OVERALL_FAT_LOSS = 'Overall Fat Loss',
  LEG_TONING = 'Leg Toning',
  MUSCLE_GAIN = 'Muscle Gain',
  HIIT = 'High Intensity (HIIT)'
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
  height: number; // Height in cm
  weight: number; // Current weight in kg
  targetWeight: number; // Target weight in kg
  durationWeeks: number; // Timeframe to achieve goal
  goal: Goal;
  workoutGoal?: WorkoutGoal; 
  workoutLocation?: WorkoutLocation; 
  isOnboarded: boolean;
  progressPhotos?: ProgressPhoto[];
  isPremium?: boolean;
  dailyWaterGoal?: number; // In ml
}

export interface FoodAnalysis {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthScore: number; // 1-10
  microAnalysis: string;
  timestamp: string;
  imageUrl?: string;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
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
  instructions?: string[];
}
