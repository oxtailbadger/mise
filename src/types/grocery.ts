import type { ItemCategory } from "@prisma/client";

export type { ItemCategory };

/** Display order for categories in the Buy section */
export const CATEGORY_ORDER: ItemCategory[] = [
  "PRODUCE",
  "PROTEIN",
  "DAIRY",
  "DRY_GOODS",
  "CANNED",
  "OTHER",
];

export interface GroceryItemClient {
  id: string;
  listId: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: ItemCategory;
  isPantryCheck: boolean;
  isManual: boolean;
  isQuickTrip: boolean;
  isChecked: boolean;
  sortOrder: number;
}

export interface GroceryListClient {
  id: string;
  weekStart: string; // "YYYY-MM-DD"
  items: GroceryItemClient[];
}
