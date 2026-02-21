"use client";

import { useState, useEffect } from "react";
import { Search, Clock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GfBadge } from "@/components/gf-badge";
import type { RecipeWithDetails } from "@/types/recipe";
import type { GFStatus } from "@prisma/client";

interface RecipePickerProps {
  selectedId?: string | null;
  onSelect: (recipe: RecipeWithDetails) => void;
}

export function RecipePicker({ selectedId, onSelect }: RecipePickerProps) {
  const [search, setSearch] = useState("");
  const [recipes, setRecipes] = useState<RecipeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        const res = await fetch(`/api/recipes?${params}`);
        if (res.ok) setRecipes(await res.json());
      } finally {
        setLoading(false);
      }
    }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes…"
          className="pl-9 h-9"
        />
      </div>

      {/* Recipe list */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {search ? "No recipes match that search" : "No recipes yet — add some first!"}
          </p>
        ) : (
          recipes.map((recipe) => {
            const isSelected = recipe.id === selectedId;
            return (
              <button
                key={recipe.id}
                onClick={() => onSelect(recipe)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{recipe.name}</span>
                    <GfBadge status={recipe.gfStatus as GFStatus} />
                  </div>
                  {recipe.totalTime && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {recipe.totalTime} min
                    </p>
                  )}
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
