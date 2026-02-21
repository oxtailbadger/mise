# Mise — Feature Requirements

> **Mise** (as in *mise en place*) is a private household meal planning web app for two users. It helps plan weekly dinners, manage a shared recipe library, and generate a real-time collaborative grocery list.

---

## Table of Contents

1. [Goals & Principles](#1-goals--principles)
2. [Users & Access](#2-users--access)
3. [Meal Planner](#3-meal-planner)
4. [Recipe Library](#4-recipe-library)
5. [Grocery List](#5-grocery-list)
6. [Pantry Staples](#6-pantry-staples)
7. [Gluten-Free Awareness](#7-gluten-free-awareness)
8. [Tech Stack](#8-tech-stack)
9. [Deployment](#9-deployment)
10. [Out of Scope](#10-out-of-scope)

---

## 1. Goals & Principles

- **Mobile-first.** The app is primarily used on phones while cooking, shopping, and planning.
- **Fast and simple.** Planning a week of dinners should take minutes, not a long session.
- **Two people, one household.** Everything is shared — the plan, the recipes, the list.
- **Real ingredients, real constraints.** Recipes should take under 1 hour, use ≤ 10 ingredients, and minimize pots and pans.
- **Gluten-free by default.** One user has a gluten allergy; the app surfaces GF concerns at import time.

---

## 2. Users & Access

- **Single shared household account** protected by a shared password.
- No individual user accounts or permissions — both users have full access to everything.
- Session persists on device (stay logged in) until explicitly signed out.
- Authentication handled via NextAuth.js with a simple credential provider.

---

## 3. Meal Planner

### 3.1 Weekly View

- Displays a 7-day week (Monday–Sunday, confirmed default) with one **Dinner** slot per day.
- Default view is the current week; navigate forward/back by week.
- Each day card shows:
  - Assigned recipe name and a quick-glance tag (protein, cook time)
  - Or a status label: **Leftovers**, **Eating Out**, or **Skip**
- Tapping a day opens a bottom sheet to assign or change the meal.

### 3.2 Assigning Meals

- Search or browse the Recipe Library to select a dinner.
- Alternatively, mark the night as:
  - **Leftovers** — no ingredients added to grocery list
  - **Eating Out** — no ingredients added to grocery list
  - **Skip** — slot left empty, no ingredients added
- A meal can be reassigned or cleared at any time.

### 3.3 Planning Workflow

- Users plan 1–2 times per week, typically before a Saturday/Sunday/Monday grocery trip.
- Once meals are assigned for the week, a single **"Generate Grocery List"** action builds the list from all planned dinners.
- Re-generating the list after changes prompts: *"Update existing list or start fresh?"*

### 3.4 Carry-Forward

- Option to copy last week's meal plan as a starting point for the current week.

---

## 4. Recipe Library

### 4.1 Recipe Card Fields

Each recipe stores:

| Field | Notes |
|---|---|
| Name | Required |
| Source URL | Optional, links back to original |
| Total Time | In minutes; recipes ≤ 60 min are preferred |
| Active Cook Time | In minutes |
| Pots & Pans Count | Integer; lower is better |
| Ingredients | List of ingredient + quantity; soft limit of 10 flagged in UI |
| Instructions | Step-by-step |
| Servings | Default: 2; scalable |
| Tags | Protein type, veggie, carb, cuisine type |
| GF Status | `Confirmed GF` / `Contains Gluten` / `Needs Review` |
| GF Notes | Free-text notes on substitutions made |
| Favorite | Boolean |
| Personal Notes | Free-text field for the household to add tips or modifications |

### 4.2 Importing Recipes

**Via URL**
- User pastes a recipe URL.
- App uses the Claude API to fetch and parse the recipe into structured fields.
- Parsed recipe is shown in an editable preview before saving.

**Via Text**
- User pastes raw recipe text (copied from anywhere).
- App uses the Claude API to parse it into structured fields.
- Parsed recipe shown in editable preview before saving.

**Manual Entry**
- User fills in all fields directly via a form.

### 4.3 Gluten-Free Review on Import

- During import (URL or text), the Claude API scans ingredients for known gluten-containing items (e.g. flour, breadcrumbs, soy sauce, pasta, barley, malt).
- Flagged ingredients are highlighted with a warning and a suggested GF substitute shown alongside.
- The user decides whether to apply the substitution, edit manually, or leave as-is.
- User sets the GF status before saving: `Confirmed GF`, `Contains Gluten`, or `Needs Review`.
- See [Section 7](#7-gluten-free-awareness) for full GF details.

### 4.4 Browsing & Filtering

- Search by recipe name or ingredient.
- Filter by:
  - Total time (≤ 30 min / ≤ 60 min)
  - Ingredient count (≤ 10)
  - Pots & pans count
  - GF status
  - Protein type (chicken, beef, fish, pork, vegetarian, etc.)
  - Favorites only
- Sort by: recently added, cook time, favorites.

### 4.5 Recipe Detail View

- Full recipe display optimized for mobile reading while cooking.
- **Serving scaler** — adjust serving count (default: 2); all ingredient quantities update dynamically.
  - Common scale options: 2 (default), 4, 6, or custom.
- GF Notes section shown if any substitutions were recorded.
- "Add to This Week" shortcut to assign the recipe to any open dinner slot.

---

## 5. Grocery List

### 5.1 Generation

- Auto-generated from all recipes assigned to the current week's dinner slots.
- Leftovers, Eating Out, and Skip nights are excluded.
- Duplicate ingredients across multiple recipes are consolidated (e.g. 2 cloves garlic + 3 cloves garlic = 5 cloves garlic).
- Respects the serving scale set for each recipe at time of plan.

### 5.2 List Structure

The list is divided into two sections:

**"Check Pantry First"**
- Items that match the household's [Pantry Staples](#6-pantry-staples) list.
- These are items likely already at home (spices, oils, condiments, staples).
- Displayed separately so the user can confirm before buying.

**"Buy"**
- Everything else, grouped by grocery category:
  - Produce
  - Protein / Meat & Seafood
  - Dairy & Eggs
  - Dry Goods & Grains
  - Canned & Packaged
  - Other
- Items within each group sorted alphabetically.

### 5.3 Manual Additions

- User can add any item manually to the list (e.g. household items, snacks).
- Manually added items can be assigned to either section.
- Manual items persist if the list is regenerated.

### 5.4 Shopping Interaction

- Tap an item to check it off — it visually greys out and moves to a "Done" collapsed section.
- Tap again to uncheck.
- **Real-time sync** — both users see changes instantly; simultaneous edits are supported (last write wins per item).
- Items remain checked until the list is explicitly cleared or a new week's list is generated.

### 5.5 Quick Trip Mode

- A secondary "Quick Trip" section for mid-week one-off items.
- Independent of the weekly meal plan list.
- Cleared separately from the main list.

### 5.6 List Management

- **Clear checked items** — removes all checked items.
- **Clear all** — resets the full list with a confirmation prompt.
- **Regenerate** — re-derives the list from the current meal plan, prompting to keep or discard manual additions.

---

## 6. Pantry Staples

- A user-managed list of items always kept in the household (e.g. olive oil, salt, black pepper, garlic powder, cumin, soy sauce/tamari, canned tomatoes).
- When the grocery list is generated, any ingredient matching a pantry staple is placed in the "Check Pantry First" section.
- Matching is by ingredient name (case-insensitive, partial match supported).
- Users can add, edit, or remove staples at any time from a settings screen.
- A default starter list of common pantry items is provided on first setup.

---

## 7. Gluten-Free Awareness

- **One user has a gluten allergy.** The app treats GF safety as a first-class concern, not an afterthought.
- All recipes are imported with a GF review step — no recipe is silently marked safe.

### 7.1 Flagging on Import

- The Claude API identifies ingredients that commonly contain gluten:
  - Wheat flour, all-purpose flour, bread, breadcrumbs, pasta, couscous, barley, rye, malt, regular soy sauce, teriyaki sauce, beer, certain broths/sauces.
- Each flagged ingredient is shown with a contextual GF substitute suggestion:

  | Flagged Ingredient | Suggested Substitute |
  |---|---|
  | All-purpose flour | Rice flour, almond flour, or GF flour blend |
  | Soy sauce | Tamari or coconut aminos |
  | Pasta | GF pasta (rice or chickpea-based) |
  | Breadcrumbs | GF breadcrumbs or almond meal |
  | Soy sauce | Tamari |

- The user reviews each flag, edits ingredients as needed, and sets the final GF status before saving.

### 7.2 GF Status on Recipe Cards

- `Confirmed GF` — user has verified all ingredients are gluten-free.
- `Contains Gluten` — recipe has known gluten; not suitable as-is.
- `Needs Review` — imported without full GF verification; shown with a warning badge.

### 7.3 GF Notes Field

- Free-text field on each recipe for the household to record substitutions made (e.g. "Used tamari instead of soy sauce, worked great.").

### 7.4 Filtering

- Library can be filtered to show only `Confirmed GF` recipes.

---

## 8. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 15 (App Router) + TypeScript | Full-stack in one repo; API routes + React frontend |
| **Styling** | Tailwind CSS + shadcn/ui | Mobile-first; accessible component primitives |
| **Database** | PostgreSQL via Prisma ORM | Structured relational data; easy to self-host or migrate to cloud |
| **Auth** | NextAuth.js (Credentials provider) | Single shared household password |
| **Real-time** | Supabase Realtime (or Pusher) | Live grocery list sync between two devices |
| **Recipe Parsing** | Claude API (claude-sonnet-4-6) | URL/text parsing and GF ingredient analysis |
| **Self-hosted** | Docker Compose | Single command local setup |
| **Deployment** | Vercel (app) + Supabase (DB + Realtime) | Generous free tiers; no cold starts on Vercel |

---

## 9. Deployment

### 9.1 Self-Hosted (Local)

- `docker-compose.yml` provides:
  - Next.js app container
  - PostgreSQL container
  - Environment variable configuration via `.env`
- Accessible on the local network via a fixed IP or hostname.

### 9.2 Cloud (Production)

- **App:** Deployed to Vercel (auto-deploy from `main` branch via GitHub).
- **Database:** Supabase (PostgreSQL) with Prisma migrations.
- **Realtime:** Supabase Realtime channels for grocery list sync.
- **Environment variables:** Managed via Vercel project settings.
- **Domain:** Custom domain optional; accessible from any device with the URL and shared password.

### 9.3 CI / CD

- GitHub repository as source of truth.
- Vercel auto-deploys on push to `main`.
- Prisma migrations run on deploy via a `postinstall` or `build` script.

---

## 10. Out of Scope

The following are explicitly not part of the initial version:

- Breakfast and lunch planning
- Nutritional tracking or calorie counting
- Grocery delivery integrations (Instacart, Shipt, etc.)
- Budgeting or price tracking
- Meal history or analytics
- Push notifications or reminders
- Multiple household support or user roles
- Public recipe sharing
- Inventory / pantry quantity tracking (only a "staples" list, not quantities)
