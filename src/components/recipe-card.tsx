"use client";

import Link from "next/link";
import { Star, Clock, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GfBadge } from "@/components/gf-badge";
import type { RecipeWithDetails } from "@/types/recipe";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipe: RecipeWithDetails;
  onFavoriteToggle?: (id: string, current: boolean) => void;
}

export function RecipeCard({ recipe, onFavoriteToggle }: RecipeCardProps) {
  const protein = recipe.tags.find((t) => t.type === "PROTEIN");
  const cuisine = recipe.tags.find((t) => t.type === "CUISINE");

  return (
    <Link href={`/recipes/${recipe.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow active:scale-[0.98]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate">{recipe.name}</h3>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <GfBadge status={recipe.gfStatus} />
                {protein && (
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {protein.value}
                  </Badge>
                )}
                {cuisine && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {cuisine.value}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {recipe.totalTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {recipe.totalTime} min
                  </span>
                )}
                {recipe.potsAndPans && (
                  <span className="flex items-center gap-1">
                    <ChefHat className="h-3 w-3" />
                    {recipe.potsAndPans} {recipe.potsAndPans === 1 ? "pan" : "pans"}
                  </span>
                )}
                {recipe.ingredients.length > 0 && (
                  <span>{recipe.ingredients.length} ingredients</span>
                )}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                onFavoriteToggle?.(recipe.id, recipe.favorite);
              }}
              className="p-1 -mr-1 shrink-0 touch-manipulation"
              aria-label={recipe.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  recipe.favorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
