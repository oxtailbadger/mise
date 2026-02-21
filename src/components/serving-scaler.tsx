"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scaleQuantity } from "@/lib/recipe-utils";
import type { RecipeIngredient } from "@prisma/client";

interface ServingScalerProps {
  originalServings: number;
  ingredients: RecipeIngredient[];
}

export function ServingScaler({ originalServings, ingredients }: ServingScalerProps) {
  const [servings, setServings] = useState(originalServings);

  const presets = [2, 4, 6];

  return (
    <div className="space-y-4">
      {/* Scaler controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Servings</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            disabled={servings <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-lg font-semibold w-8 text-center">{servings}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setServings((s) => s + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex gap-1 ml-2">
          {presets.map((p) => (
            <Button
              key={p}
              variant={servings === p ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setServings(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Scaled ingredients */}
      <ul className="space-y-2">
        {ingredients.map((ing) => (
          <li key={ing.id} className="flex items-start gap-2 text-sm">
            <span className="font-medium min-w-[60px] text-right tabular-nums">
              {scaleQuantity(ing.quantity, originalServings, servings)}
              {ing.unit ? ` ${ing.unit}` : ""}
            </span>
            <span className="flex-1">
              <span className={ing.isGlutenFlag ? "text-amber-700 font-medium" : ""}>
                {ing.name}
              </span>
              {ing.notes && (
                <span className="text-muted-foreground">, {ing.notes}</span>
              )}
              {ing.isGlutenFlag && ing.gfSubstitute && (
                <span className="block text-xs text-amber-600 mt-0.5">
                  ⚠ GF sub: {ing.gfSubstitute}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
