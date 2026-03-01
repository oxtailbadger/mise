-- ============================================================
-- Migration 2: Make householdId non-nullable on all tables;
-- update unique constraints to be household-scoped;
-- add performance indexes.
-- ============================================================

-- Recipe: make non-nullable, add index
ALTER TABLE "Recipe" ALTER COLUMN "householdId" SET NOT NULL;
CREATE INDEX "Recipe_householdId_idx" ON "Recipe"("householdId");

-- MealPlan: make non-nullable; swap unique constraint; add index
ALTER TABLE "MealPlan" ALTER COLUMN "householdId" SET NOT NULL;
DROP INDEX "MealPlan_weekStart_dayOfWeek_key";
CREATE UNIQUE INDEX "MealPlan_householdId_weekStart_dayOfWeek_key" ON "MealPlan"("householdId", "weekStart", "dayOfWeek");
CREATE INDEX "MealPlan_householdId_weekStart_idx" ON "MealPlan"("householdId", "weekStart");

-- GroceryList: make non-nullable; swap unique constraint; add index
ALTER TABLE "GroceryList" ALTER COLUMN "householdId" SET NOT NULL;
DROP INDEX "GroceryList_weekStart_key";
CREATE UNIQUE INDEX "GroceryList_householdId_weekStart_key" ON "GroceryList"("householdId", "weekStart");
CREATE INDEX "GroceryList_householdId_weekStart_idx" ON "GroceryList"("householdId", "weekStart");

-- GroceryItem: add listId index
CREATE INDEX "GroceryItem_listId_idx" ON "GroceryItem"("listId");

-- PantryStaple: make non-nullable; swap unique constraint; add index
ALTER TABLE "PantryStaple" ALTER COLUMN "householdId" SET NOT NULL;
DROP INDEX "PantryStaple_name_key";
CREATE UNIQUE INDEX "PantryStaple_householdId_name_key" ON "PantryStaple"("householdId", "name");
CREATE INDEX "PantryStaple_householdId_idx" ON "PantryStaple"("householdId");

-- HouseholdSettings: make non-nullable
ALTER TABLE "HouseholdSettings" ALTER COLUMN "householdId" SET NOT NULL;
