"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ParsedIngredient } from "@/types/recipe";
import type { GFStatus } from "@prisma/client";

interface GfReviewStepProps {
  ingredients: ParsedIngredient[];
  initialGfStatus: GFStatus;
  onComplete: (ingredients: ParsedIngredient[], gfStatus: GFStatus, gfNotes: string) => void;
  onBack: () => void;
}

export function GfReviewStep({
  ingredients,
  initialGfStatus,
  onComplete,
  onBack,
}: GfReviewStepProps) {
  const [items, setItems] = useState<ParsedIngredient[]>(ingredients);
  const [gfStatus, setGfStatus] = useState<GFStatus>(initialGfStatus);
  const [gfNotes, setGfNotes] = useState("");

  const flagged = items.filter((i) => i.isGlutenFlag);

  function updateIngredient(index: number, updates: Partial<ParsedIngredient>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }

  function applySubstitute(index: number) {
    const item = items[index];
    if (item.gfSubstitute) {
      updateIngredient(index, { name: item.gfSubstitute, isGlutenFlag: false });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Gluten-Free Review</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {flagged.length === 0
              ? "No gluten-containing ingredients detected."
              : `${flagged.length} ingredient${flagged.length > 1 ? "s" : ""} may contain gluten. Review and substitute as needed.`}
          </p>
        </div>
      </div>

      {/* Flagged ingredients */}
      {flagged.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Flagged Ingredients</p>
          {items.map((ing, i) => {
            if (!ing.isGlutenFlag) return null;
            return (
              <div key={i} className="border border-amber-200 rounded-lg p-3 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800">{ing.name}</span>
                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                    Contains Gluten
                  </Badge>
                </div>
                {ing.gfSubstitute && (
                  <p className="text-xs text-muted-foreground">
                    Suggested: <span className="font-medium">{ing.gfSubstitute}</span>
                  </p>
                )}
                <div className="flex gap-2">
                  {ing.gfSubstitute && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => applySubstitute(i)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Use substitute
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => updateIngredient(i, { isGlutenFlag: false })}
                  >
                    Keep as-is
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All ingredients preview */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">All Ingredients</p>
        {items.map((ing, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground min-w-[80px] text-right">
              {ing.quantity} {ing.unit}
            </span>
            <Input
              value={ing.name}
              onChange={(e) => updateIngredient(i, { name: e.target.value })}
              className="h-7 text-sm flex-1"
            />
            {ing.isGlutenFlag && (
              <span className="text-amber-500 text-xs">⚠</span>
            )}
          </div>
        ))}
      </div>

      {/* GF Status */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">GF Status</p>
        <Select value={gfStatus} onValueChange={(v) => setGfStatus(v as GFStatus)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CONFIRMED_GF">✅ Confirmed GF</SelectItem>
            <SelectItem value="CONTAINS_GLUTEN">❌ Contains Gluten</SelectItem>
            <SelectItem value="NEEDS_REVIEW">⚠️ Needs Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* GF Notes */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">GF Notes (optional)</p>
        <Input
          placeholder="e.g. Used tamari instead of soy sauce"
          value={gfNotes}
          onChange={(e) => setGfNotes(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => onComplete(items, gfStatus, gfNotes)}
          className="flex-1"
        >
          Save Recipe
        </Button>
      </div>
    </div>
  );
}
