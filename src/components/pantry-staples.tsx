"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PantryStaple {
  id: string;
  name: string;
}

export function PantryStaplesClient() {
  const [staples, setStaples] = useState<PantryStaple[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/pantry")
      .then((r) => r.json())
      .then((data) => setStaples(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Could not load pantry staples"))
      .finally(() => setLoading(false));
  }, []);

  // ── Seed defaults ───────────────────────────────────────────────────────────

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/pantry/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      setStaples(data.staples);
      toast.success(`Added ${data.seeded} starter items`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load starter list");
    } finally {
      setSeeding(false);
    }
  }

  // ── Add item ────────────────────────────────────────────────────────────────

  async function handleAdd() {
    const name = addName.trim().toLowerCase();
    if (!name) return;

    // Optimistic — check for local dupe first
    if (staples.some((s) => s.name === name)) {
      toast("Already in your pantry");
      setAddName("");
      return;
    }

    setAdding(true);
    const placeholder: PantryStaple = { id: `temp-${Date.now()}`, name };
    setStaples((prev) => [...prev, placeholder].sort((a, b) => a.name.localeCompare(b.name)));
    setAddName("");

    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Add failed");
      // Replace placeholder with real record
      setStaples((prev) =>
        prev.map((s) => s.id === placeholder.id ? data : s)
      );
      inputRef.current?.focus();
    } catch (err) {
      // Revert
      setStaples((prev) => prev.filter((s) => s.id !== placeholder.id));
      toast.error(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setAdding(false);
    }
  }

  // ── Delete item ─────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const removed = staples.find((s) => s.id === id);
    setStaples((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/pantry/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      if (removed) setStaples((prev) => [...prev, removed].sort((a, b) => a.name.localeCompare(b.name)));
      toast.error("Could not remove item");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-muted rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Empty state — seed CTA */}
      {staples.length === 0 && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            No pantry staples yet. Load a starter list or add your own.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="gap-2"
          >
            {seeding
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            Load starter list
          </Button>
        </div>
      )}

      {/* Staple chips */}
      {staples.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {staples.map((staple) => (
              <span
                key={staple.id}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-muted/50 capitalize"
              >
                {staple.name}
                <button
                  onClick={() => handleDelete(staple.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5 rounded-full"
                  aria-label={`Remove ${staple.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Refresh / add more defaults button */}
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {seeding
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3" />}
            Add missing defaults
          </button>
        </>
      )}

      {/* Add item input */}
      <div className="flex gap-2 pt-1">
        <Input
          ref={inputRef}
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add an item (e.g. tahini)"
          className="h-9 flex-1"
          disabled={adding}
        />
        <Button
          size="sm"
          className="h-9 gap-1.5 shrink-0"
          onClick={handleAdd}
          disabled={adding || !addName.trim()}
        >
          {adding
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>

      {staples.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {staples.length} item{staples.length !== 1 ? "s" : ""} · These are automatically checked
          against your grocery list when generating
        </p>
      )}
    </div>
  );
}
