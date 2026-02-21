"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecipePicker } from "@/components/recipe-picker";
import { DAY_NAMES_LONG, getDayDate, formatDayDate } from "@/lib/week-utils";
import type { MealPlanDay, DayStatus } from "@/types/meal-plan";
import type { RecipeWithDetails } from "@/types/recipe";

interface DaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOfWeek: number | null;
  weekStart: Date | null;
  plan: MealPlanDay | undefined;
  onSave: (
    dayOfWeek: number,
    status: DayStatus,
    recipeId?: string | null,
    customMealName?: string | null
  ) => Promise<void>;
  onClear: (dayOfWeek: number) => Promise<void>;
}

const STATUS_BUTTONS: { status: DayStatus; label: string; emoji: string }[] = [
  { status: "LEFTOVERS",  label: "Leftovers",  emoji: "🥡" },
  { status: "EATING_OUT", label: "Eating Out", emoji: "🍽️" },
  { status: "SKIP",       label: "Skip night", emoji: "💤" },
];

export function DaySheet({
  open,
  onOpenChange,
  dayOfWeek,
  weekStart,
  plan,
  onSave,
  onClear,
}: DaySheetProps) {
  const [saving, setSaving] = useState(false);
  const [manualName, setManualName] = useState("");

  if (dayOfWeek === null || weekStart === null) return null;

  const dayDate = getDayDate(weekStart, dayOfWeek);
  const title = `${DAY_NAMES_LONG[dayOfWeek]}, ${formatDayDate(dayDate)}`;
  const currentRecipeId = plan?.status === "PLANNED" ? plan.recipeId : null;

  // Pre-populate manual field from existing custom meal name if no recipe is linked
  const existingManual =
    plan?.status === "PLANNED" && !plan?.recipe ? (plan.customMealName ?? "") : "";
  const manualValue = manualName || existingManual;

  async function handleStatus(status: DayStatus) {
    if (dayOfWeek === null) return;
    setSaving(true);
    try {
      await onSave(dayOfWeek, status, null, null);
      onOpenChange(false);
    } finally {
      setSaving(false);
      setManualName("");
    }
  }

  async function handleRecipePick(recipe: RecipeWithDetails) {
    if (dayOfWeek === null) return;
    setSaving(true);
    try {
      await onSave(dayOfWeek, "PLANNED", recipe.id, null);
      onOpenChange(false);
    } finally {
      setSaving(false);
      setManualName("");
    }
  }

  async function handleManualSave() {
    if (dayOfWeek === null || !manualValue.trim()) return;
    setSaving(true);
    try {
      await onSave(dayOfWeek, "PLANNED", null, manualValue.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
      setManualName("");
    }
  }

  async function handleClear() {
    if (dayOfWeek === null) return;
    setSaving(true);
    try {
      await onClear(dayOfWeek);
      onOpenChange(false);
    } finally {
      setSaving(false);
      setManualName("");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setManualName(""); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-safe">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>

        {saving ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 pb-6">
            {/* Clear button — only shown when a day is already planned */}
            {plan && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
                Clear this day
              </Button>
            )}

            {/* Status quick-picks */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Quick set
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_BUTTONS.map(({ status, label, emoji }) => {
                  const isActive = plan?.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatus(status)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xl">{emoji}</span>
                      <span className="text-xs font-medium leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or type a meal name</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Manual entry */}
            <div className="flex gap-2">
              <Input
                value={manualValue}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSave()}
                placeholder="e.g. Homemade pizza"
                className="h-9 flex-1"
              />
              <Button
                size="sm"
                className="h-9 px-4 shrink-0"
                onClick={handleManualSave}
                disabled={!manualValue.trim()}
              >
                Set
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or pick from your recipes</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Recipe picker */}
            <RecipePicker
              selectedId={currentRecipeId}
              onSelect={handleRecipePick}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
