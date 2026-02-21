-- CreateEnum
CREATE TYPE "GFStatus" AS ENUM ('CONFIRMED_GF', 'CONTAINS_GLUTEN', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('PLANNED', 'LEFTOVERS', 'EATING_OUT', 'SKIP');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('PRODUCE', 'PROTEIN', 'DAIRY', 'DRY_GOODS', 'CANNED', 'OTHER');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('PROTEIN', 'VEGGIE', 'CARB', 'CUISINE');

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "totalTime" INTEGER,
    "activeCookTime" INTEGER,
    "potsAndPans" INTEGER,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "instructions" TEXT NOT NULL,
    "gfStatus" "GFStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "gfNotes" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "unit" TEXT,
    "notes" TEXT,
    "isGlutenFlag" BOOLEAN NOT NULL DEFAULT false,
    "gfSubstitute" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeTag" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "type" "TagType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "RecipeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'PLANNED',
    "recipeId" TEXT,
    "customMealName" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryList" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "unit" TEXT,
    "category" "ItemCategory" NOT NULL DEFAULT 'OTHER',
    "isPantryCheck" BOOLEAN NOT NULL DEFAULT false,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "isQuickTrip" BOOLEAN NOT NULL DEFAULT false,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryStaple" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PantryStaple_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeTag_recipeId_type_value_key" ON "RecipeTag"("recipeId", "type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_weekStart_dayOfWeek_key" ON "MealPlan"("weekStart", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "GroceryList_weekStart_key" ON "GroceryList"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PantryStaple_name_key" ON "PantryStaple"("name");

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeTag" ADD CONSTRAINT "RecipeTag_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryItem" ADD CONSTRAINT "GroceryItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "GroceryList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
