"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart, RefreshCw, Loader2, Plus, Trash2, PackageSearch,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroceryItemRow } from "@/components/grocery-item-row";
import { toast } from "sonner";
import {
  formatWeekRange, fromISODate, addWeeks, toISODate, getWeekStart, isCurrentWeek,
} from "@/lib/week-utils";
import { ITEM_CATEGORY_LABEL } from "@/lib/recipe-utils";
import { CATEGORY_ORDER } from "@/types/grocery";
import type { GroceryListClient, GroceryItemClient, ItemCategory } from "@/types/grocery";
import { supabase } from "@/lib/supabase";

interface Props {
  weekStart: string; // "YYYY-MM-DD" — seeds the initial week
}

export function GroceryClient({ weekStart: initialWeekStart }: Props) {
  const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekStart);
  const [list, setList] = useState<GroceryListClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addUnit, setAddUnit] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const weekLabel = formatWeekRange(fromISODate(currentWeekStart));
  const onCurrentWeek = isCurrentWeek(fromISODate(currentWeekStart));

  // ── Week navigation ─────────────────────────────────────────────────────────

  function navigate(delta: number) {
    setList(null);
    setShowAddForm(false);
    setAddName(""); setAddQty(""); setAddUnit("");
    setCurrentWeekStart((prev) => toISODate(addWeeks(fromISODate(prev), delta)));
  }

  function goToCurrentWeek() {
    setList(null);
    setShowAddForm(false);
    setAddName(""); setAddQty(""); setAddUnit("");
    setCurrentWeekStart(toISODate(getWeekStart()));
  }

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/grocery?weekStart=${currentWeekStart}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setList(data); // null when no list exists
    } catch {
      toast.error("Could not load grocery list");
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Supabase Realtime subscription ─────────────────────────────────────────

  useEffect(() => {
    if (!list?.id) return;
    const listId = list.id;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`grocery-list:${listId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "GroceryItem", filter: `listId=eq.${listId}` },
          () => { fetchList(); }
        )
        .subscribe();
    } catch {
      // Supabase not configured — realtime disabled, optimistic updates still work
    }

    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  }, [list?.id, fetchList]);

  // ── Generate / regenerate ───────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/grocery/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: currentWeekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generate failed");
      setList(data);
      toast.success("Grocery list generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate list");
    } finally {
      setGenerating(false);
    }
  }

  // ── Toggle checked ──────────────────────────────────────────────────────────

  async function handleToggle(id: string, checked: boolean) {
    setList((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => i.id === id ? { ...i, isChecked: checked } : i) }
        : prev
    );
    try {
      const res = await fetch(`/api/grocery/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isChecked: checked }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      setList((prev) =>
        prev
          ? { ...prev, items: prev.items.map((i) => i.id === id ? { ...i, isChecked: !checked } : i) }
          : prev
      );
      toast.error("Could not update item");
    }
  }

  // ── Delete item ─────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const removed = list?.items.find((i) => i.id === id);
    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev
    );
    try {
      const res = await fetch(`/api/grocery/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      if (removed) {
        setList((prev) =>
          prev ? { ...prev, items: [...prev.items, removed].sort((a, b) => a.sortOrder - b.sortOrder) } : prev
        );
      }
      toast.error("Could not remove item");
    }
  }

  // ── Add manual item ─────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!list || !addName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/grocery/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: list.id,
          name: addName.trim(),
          quantity: addQty.trim() || null,
          unit: addUnit.trim() || null,
        }),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error ?? "Add failed");
      setList((prev) => prev ? { ...prev, items: [...prev.items, item] } : prev);
      setAddName("");
      setAddQty("");
      setAddUnit("");
      addInputRef.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setAdding(false);
    }
  }

  // ── Clear checked ───────────────────────────────────────────────────────────

  async function handleClearChecked() {
    if (!list) return;
    const checkedIds = new Set(list.items.filter((i) => i.isChecked).map((i) => i.id));
    setList((prev) => prev ? { ...prev, items: prev.items.filter((i) => !checkedIds.has(i.id)) } : prev);
    try {
      const res = await fetch("/api/grocery/clear-checked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list.id }),
      });
      if (!res.ok) throw new Error("Clear failed");
      toast.success("Checked items cleared");
    } catch {
      fetchList();
      toast.error("Could not clear checked items");
    }
  }

  // ── Clear all ───────────────────────────────────────────────────────────────

  async function handleClearAll() {
    if (!list) return;
    const backup = list;
    setList(null);
    try {
      const res = await fetch(`/api/grocery?weekStart=${currentWeekStart}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Clear failed");
      toast.success("Grocery list cleared");
    } catch {
      setList(backup);
      toast.error("Could not clear list");
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const pantryItems  = list?.items.filter((i) => i.isPantryCheck) ?? [];
  const buyItems     = list?.items.filter((i) => !i.isPantryCheck) ?? [];
  const checkedCount = list?.items.filter((i) => i.isChecked).length ?? 0;
  const totalCount   = list?.items.length ?? 0;

  const byCategory = CATEGORY_ORDER.reduce<Record<ItemCategory, GroceryItemClient[]>>(
    (acc, cat) => {
      acc[cat] = buyItems.filter((i) => i.category === cat);
      return acc;
    },
    {} as Record<ItemCategory, GroceryItemClient[]>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 bg-background sticky top-0 z-10 border-b border-border">
        {/* Week navigation row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold">{weekLabel}</p>
            {!onCurrentWeek ? (
              <button
                onClick={goToCurrentWeek}
                className="text-[11px] text-primary font-medium mt-0.5"
              >
                Back to this week
              </button>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-0.5">This week</p>
            )}
          </div>

          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Progress + Regenerate row */}
        {list && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? `${checkedCount} of ${totalCount} checked` : "List is empty"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-1.5 h-7 text-xs"
            >
              {generating
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3" />}
              Regenerate
            </Button>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>

        ) : !list ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="p-4 bg-muted rounded-full">
              <PackageSearch className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">No grocery list yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                Generate one from your planned meals for {weekLabel}
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ShoppingCart className="h-4 w-4" />}
              Generate Grocery List
            </Button>
          </div>

        ) : list.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <p className="text-sm text-muted-foreground">All items cleared!</p>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>

        ) : (
          <div className="space-y-6">

            {/* Check Pantry First */}
            {pantryItems.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-2">
                  Check Pantry First ({pantryItems.length})
                </h2>
                <div className="divide-y divide-border rounded-xl border border-amber-200 bg-amber-50/50 px-3">
                  {pantryItems.map((item) => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Buy — grouped by category */}
            {CATEGORY_ORDER.map((cat) => {
              const items = byCategory[cat];
              if (!items || items.length === 0) return null;
              return (
                <section key={cat}>
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    {ITEM_CATEGORY_LABEL[cat]} ({items.length})
                  </h2>
                  <div className="divide-y divide-border rounded-xl border border-border bg-card px-3">
                    {items.map((item) => (
                      <GroceryItemRow
                        key={item.id}
                        item={item}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add item ───────────────────────────────────────────────────────── */}
      {list && (
        <div className="px-4 py-3 border-t border-border bg-background">
          {showAddForm ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  ref={addInputRef}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Item name"
                  className="h-9 flex-1"
                  autoFocus
                />
                <Input
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  placeholder="Qty"
                  className="h-9 w-16 shrink-0"
                />
                <Input
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Unit"
                  className="h-9 w-20 shrink-0"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-9 gap-1.5"
                  onClick={handleAdd}
                  disabled={adding || !addName.trim()}
                >
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Item
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={() => { setShowAddForm(false); setAddName(""); setAddQty(""); setAddUnit(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 gap-1.5 justify-start text-muted-foreground"
              onClick={() => { setShowAddForm(true); setTimeout(() => addInputRef.current?.focus(), 50); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add an item…
            </Button>
          )}
        </div>
      )}

      {/* ── Footer actions ──────────────────────────────────────────────────── */}
      {list && list.items.length > 0 && (
        <div className="px-4 pb-3 bg-background flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={handleClearChecked}
            disabled={checkedCount === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear checked ({checkedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleClearAll}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
