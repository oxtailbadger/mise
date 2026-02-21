import type {
  Recipe,
  RecipeIngredient,
  RecipeTag,
  GFStatus,
  TagType,
} from "@prisma/client";

export type RecipeWithDetails = Recipe & {
  ingredients: RecipeIngredient[];
  tags: RecipeTag[];
};

// Ingredient as parsed by Claude before DB save
export type ParsedIngredient = {
  name: string;
  quantity: string;
  unit?: string;
  notes?: string;
  isGlutenFlag: boolean;
  gfSubstitute?: string;
  sortOrder?: number;
};

// Full parsed recipe returned from Claude
export type ParsedRecipe = {
  name: string;
  sourceUrl?: string;
  totalTime?: number;
  activeCookTime?: number;
  potsAndPans?: number;
  servings: number;
  instructions: string; // newline-separated steps
  ingredients: ParsedIngredient[];
  tags: { type: TagType; value: string }[];
  gfNotes?: string;
};

// Filter state for recipe list
export type RecipeFilters = {
  search: string;
  gfOnly: boolean;
  favoritesOnly: boolean;
  maxTime?: number; // minutes
  protein?: string;
};

export type { GFStatus, TagType };
