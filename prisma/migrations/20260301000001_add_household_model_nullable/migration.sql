-- ============================================================
-- Migration 1: Add Household model; add nullable householdId
-- to all tenant tables; backfill existing Stanton data.
-- ============================================================

-- CreateTable: Household
CREATE TABLE "Household" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "password"  TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Household_name_key" ON "Household"("name");

-- AlterTable: Recipe — add nullable householdId
ALTER TABLE "Recipe" ADD COLUMN "householdId" TEXT;

-- AlterTable: MealPlan — add nullable householdId
ALTER TABLE "MealPlan" ADD COLUMN "householdId" TEXT;

-- AlterTable: GroceryList — add nullable householdId
ALTER TABLE "GroceryList" ADD COLUMN "householdId" TEXT;

-- AlterTable: PantryStaple — add nullable householdId
ALTER TABLE "PantryStaple" ADD COLUMN "householdId" TEXT;

-- AlterTable: HouseholdSettings — add nullable householdId + drop singleton default on id
ALTER TABLE "HouseholdSettings" ADD COLUMN "householdId" TEXT;
ALTER TABLE "HouseholdSettings" ALTER COLUMN "id" DROP DEFAULT;

CREATE UNIQUE INDEX "HouseholdSettings_householdId_key" ON "HouseholdSettings"("householdId");

-- AddForeignKey constraints (nullable, so no cascade issues during backfill)
ALTER TABLE "Recipe"            ADD CONSTRAINT "Recipe_householdId_fkey"            FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealPlan"          ADD CONSTRAINT "MealPlan_householdId_fkey"          FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroceryList"       ADD CONSTRAINT "GroceryList_householdId_fkey"       FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PantryStaple"      ADD CONSTRAINT "PantryStaple_householdId_fkey"      FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HouseholdSettings" ADD CONSTRAINT "HouseholdSettings_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Backfill: Create the Stanton household (password hash decoded
-- from HOUSEHOLD_PASSWORD_HASH_B64 in .env), then set
-- householdId = 'household_stanton' on every existing row.
-- ============================================================

INSERT INTO "Household" ("id", "name", "password", "createdAt", "updatedAt")
VALUES (
    'household_stanton',
    'Stanton',
    '$2b$10$ruCkKCzORfEMNzWcQUv1R.F7T1afrewdM0yLjMZtY3EwKQeKbbSo2',
    NOW(),
    NOW()
);

UPDATE "Recipe"            SET "householdId" = 'household_stanton';
UPDATE "MealPlan"          SET "householdId" = 'household_stanton';
UPDATE "GroceryList"       SET "householdId" = 'household_stanton';
UPDATE "PantryStaple"      SET "householdId" = 'household_stanton';
UPDATE "HouseholdSettings" SET "householdId" = 'household_stanton';
