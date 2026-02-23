"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DayCard } from "@/components/day-card";
import { DaySheet } from "@/components/day-sheet";
import { toast } from "sonner";
import {
  getWeekStart,
  addWeeks,
  toISODate,
  formatWeekRange,
  isCurrentWeek,
} from "@/lib/week-utils";
import type { WeekPlan, MealPlanDay, DayStatus } from "@/types/meal-plan";

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart());
  const [weekPlan, setWeekPlan] = useState<WeekPlan>({});
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeDow, setActiveDow] = useState<number | null>(null);
  const [carryingForward, setCarryingForward] = useState(false);

  // ── Fetch week plan ─────────────────────────────────────────────────────────

  const fetchWeek = useCallback(async (ws: Date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meal-plan?weekStart=${toISODate(ws)}`);
      if (!res.ok) throw new Error("Failed to load");
      const days: MealPlanDay[] = await res.json();
      const map: WeekPlan = {};
      days.forEach((d) => { map[d.dayOfWeek] = d; });
      setWeekPlan(map);
    } catch {
      toast.error("Could not load meal plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeek(weekStart); }, [weekStart, fetchWeek]);

  // ── Week navigation ─────────────────────────────────────────────────────────

  function prevWeek() { setWeekStart((w) => addWeeks(w, -1)); }
  function nextWeek() { setWeekStart((w) => addWeeks(w, 1)); }
  function goToday()  { setWeekStart(getWeekStart()); }

  // ── Open sheet for a day ────────────────────────────────────────────────────

  function openDay(dow: number) {
    setActiveDow(dow);
    setSheetOpen(true);
  }

  // ── Upsert a day ────────────────────────────────────────────────────────────

  async function handleSave(
    dow: number,
    status: DayStatus,
    recipeId?: string | null,
    customMealName?: string | null
  ) {
    const res = await fetch("/api/meal-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: toISODate(weekStart),
        dayOfWeek: dow,
        status,
        recipeId: recipeId ?? null,
        customMealName: customMealName ?? null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    setWeekPlan((prev) => ({ ...prev, [dow]: data }));
  }

  // ── Clear a day ─────────────────────────────────────────────────────────────

  async function handleClear(dow: number) {
    const res = await fetch(
      `/api/meal-plan?weekStart=${toISODate(weekStart)}&dayOfWeek=${dow}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Clear failed");
    }
    setWeekPlan((prev) => {
      const next = { ...prev };
      delete next[dow];
      return next;
    });
  }

  // ── Carry forward last week ─────────────────────────────────────────────────

  async function handleCarryForward() {
    setCarryingForward(true);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "carry-forward", weekStart: toISODate(weekStart) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Carry forward failed");
      if (Array.isArray(data)) {
        const map: WeekPlan = {};
        (data as MealPlanDay[]).forEach((d) => { map[d.dayOfWeek] = d; });
        setWeekPlan(map);
        toast.success("Last week's plan copied!");
      } else {
        toast("No previous week to copy from");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not carry forward");
    } finally {
      setCarryingForward(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const onCurrentWeek = isCurrentWeek(weekStart);
  const todayDow = (new Date().getUTCDay() + 6) % 7; // 0=Mon … 6=Sun

  const plannedCount = Object.values(weekPlan).filter(
    (d) => d.status === "PLANNED" && d.recipeId
  ).length;

  const isEmpty = Object.keys(weekPlan).length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Week header ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 bg-background sticky top-0 z-10 border-b border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold">{formatWeekRange(weekStart)}</p>
            {!onCurrentWeek ? (
              <button
                onClick={goToday}
                className="text-[11px] text-primary font-medium mt-0.5"
              >
                Back to this week
              </button>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-0.5">This week</p>
            )}
          </div>

          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Day list ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[62px] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
              <DayCard
                key={dow}
                dayOfWeek={dow}
                weekStart={weekStart}
                plan={weekPlan[dow]}
                isToday={onCurrentWeek && dow === todayDow}
                onClick={() => openDay(dow)}
              />
            ))}

            {/* Carry forward — only when week is completely empty */}
            {isEmpty && (
              <button
                onClick={handleCarryForward}
                disabled={carryingForward}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {carryingForward
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RotateCcw className="h-4 w-4" />
                }
                Copy last week&apos;s plan
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Footer: Generate Grocery List ────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-border bg-background">
        <Link
          href={`/grocery?weekStart=${toISODate(weekStart)}&generate=true`}
          className={plannedCount === 0 ? "pointer-events-none" : ""}
        >
          <Button className="w-full gap-2" disabled={plannedCount === 0}>
            <ShoppingCart className="h-4 w-4" />
            {plannedCount > 0
              ? `Generate Grocery List (${plannedCount} meal${plannedCount !== 1 ? "s" : ""})`
              : "Generate Grocery List"}
          </Button>
        </Link>
      </div>

      {/* ── Day sheet (bottom drawer) ─────────────────────────────────────────── */}
      <DaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        dayOfWeek={activeDow}
        weekStart={weekStart}
        plan={activeDow !== null ? weekPlan[activeDow] : undefined}
        onSave={handleSave}
        onClear={handleClear}
      />
    </div>
  );
}
