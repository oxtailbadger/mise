import type { DayStatus } from "@prisma/client";

export type { DayStatus };

export interface MealPlanDay {
  id: string;
  weekStart: string; // ISO date "YYYY-MM-DD"
  dayOfWeek: number; // 0=Mon … 6=Sun
  status: DayStatus;
  servings: number;
  recipeId: string | null;
  customMealName: string | null;
  recipe: {
    id: string;
    name: string;
    totalTime: number | null;
    gfStatus: string;
  } | null;
}

/** Sparse map from dayOfWeek (0–6) to MealPlanDay */
export type WeekPlan = Record<number, MealPlanDay>;

export interface UpsertDayPayload {
  weekStart: string;
  dayOfWeek: number;
  status: DayStatus;
  recipeId?: string | null;
  customMealName?: string | null;
  servings?: number;
}
