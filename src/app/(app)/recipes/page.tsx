"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/recipe-card";
import { toast } from "sonner";
import type { RecipeWithDetails } from "@/types/recipe";

const FILTERS = [
  { label: "All", key: "all" },
  { label: "GF Only", key: "gf" },
  { label: "Favorites", key: "favorites" },
  { label: "≤30 min", key: "quick" },
];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeFilter === "gf") params.set("gfOnly", "true");
    if (activeFilter === "favorites") params.set("favoritesOnly", "true");
    if (activeFilter === "quick") params.set("maxTime", "30");

    try {
      const res = await fetch(`/api/recipes?${params}`);
      if (!res.ok) throw new Error("Failed to load recipes");
      setRecipes(await res.json());
    } catch {
      toast.error("Could not load recipes");
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    const t = setTimeout(fetchRecipes, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchRecipes, search]);

  async function handleFavoriteToggle(id: string) {
    try {
      await fetch(`/api/recipes/${id}/favorite`, { method: "POST" });
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
      );
    } catch {
      toast.error("Could not update favorite");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-3 bg-background sticky top-0 z-10 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Recipes</h1>
          <Link href="/recipes/new">
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes or ingredients…"
            className="pl-9 pr-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-3">🍳</p>
            <p className="font-semibold text-lg">No recipes yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              {search || activeFilter !== "all"
                ? "Try a different search or filter"
                : "Add your first recipe to get started"}
            </p>
            {!search && activeFilter === "all" && (
              <Link href="/recipes/new">
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Recipe
                </Button>
              </Link>
            )}
          </div>
        ) : (
          recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
