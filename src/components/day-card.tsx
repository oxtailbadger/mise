"use client";

import { Clock, ChevronRight, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_NAMES, getDayDate, formatDayDate } from "@/lib/week-utils";
import type { MealPlanDay } from "@/types/meal-plan";

interface DayCardProps {
  dayOfWeek: number; // 0=Mon … 6=Sun
  weekStart: Date;
  plan: MealPlanDay | undefined;
  isToday: boolean;
  onClick: () => void;
}

const STATUS_DISPLAY: Record<string, { label: string; emoji: string; className: string }> = {
  LEFTOVERS:  { label: "Leftovers",  emoji: "🥡", className: "text-amber-600 bg-amber-50 border-amber-200" },
  EATING_OUT: { label: "Eating Out", emoji: "🍽️", className: "text-blue-600 bg-blue-50 border-blue-200" },
  SKIP:       { label: "Skip",       emoji: "💤", className: "text-muted-foreground bg-muted border-border" },
};

export function DayCard({ dayOfWeek, weekStart, plan, isToday, onClick }: DayCardProps) {
  const dayDate = getDayDate(weekStart, dayOfWeek);
  const dayName = DAY_NAMES[dayOfWeek];
  const dateLabel = formatDayDate(dayDate);

  const hasRecipe = plan?.status === "PLANNED" && !!plan?.recipe;
  const hasManual = plan?.status === "PLANNED" && !plan?.recipe && !!plan?.customMealName;
  const statusInfo = plan && plan.status !== "PLANNED" ? STATUS_DISPLAY[plan.status] : null;
  const isEmpty = !plan;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors active:scale-[0.99]",
        isToday
          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card hover:bg-muted/50",
        isEmpty && "border-dashed"
      )}
    >
      {/* Day label */}
      <div className="w-12 shrink-0 text-center">
        <div className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          isToday ? "text-primary" : "text-muted-foreground"
        )}>
          {dayName}
        </div>
        <div className={cn(
          "text-xs mt-0.5",
          isToday ? "text-primary font-medium" : "text-muted-foreground"
        )}>
          {dateLabel}
        </div>
      </div>

      {/* Divider */}
      <div className={cn("w-px self-stretch", isToday ? "bg-primary/20" : "bg-border")} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {hasRecipe && plan.recipe ? (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{plan.recipe.name}</p>
            {plan.recipe.totalTime && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {plan.recipe.totalTime} min
              </p>
            )}
          </div>
        ) : hasManual ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <PenLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-sm font-medium truncate">{plan.customMealName}</p>
          </div>
        ) : statusInfo ? (
          <span className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border",
            statusInfo.className
          )}>
            <span>{statusInfo.emoji}</span>
            {statusInfo.label}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground italic">Tap to plan…</span>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className={cn(
        "h-4 w-4 shrink-0",
        isToday ? "text-primary/60" : "text-muted-foreground/50"
      )} />
    </button>
  );
}
