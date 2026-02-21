"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ParsedIngredient, ParsedRecipe } from "@/types/recipe";

interface RecipeFormProps {
  initialData?: Partial<ParsedRecipe>;
  onSubmit: (data: ParsedRecipe) => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const EMPTY_INGREDIENT: ParsedIngredient = {
  name: "",
  quantity: "",
  unit: "",
  notes: "",
  isGlutenFlag: false,
  gfSubstitute: "",
};

const PROTEIN_OPTIONS = [
  "chicken", "beef", "pork", "salmon", "shrimp", "tofu",
  "turkey", "lamb", "tuna", "eggs", "vegetarian",
];

const CUISINE_OPTIONS = [
  "american", "italian", "mexican", "asian", "mediterranean",
  "thai", "indian", "french", "greek", "japanese",
];

export function RecipeForm({
  initialData,
  onSubmit,
  submitLabel = "Continue to GF Review",
  isLoading = false,
}: RecipeFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? "");
  const [totalTime, setTotalTime] = useState(String(initialData?.totalTime ?? ""));
  const [activeCookTime, setActiveCookTime] = useState(String(initialData?.activeCookTime ?? ""));
  const [potsAndPans, setPotsAndPans] = useState(String(initialData?.potsAndPans ?? ""));
  const [servings, setServings] = useState(String(initialData?.servings ?? "2"));
  const [instructions, setInstructions] = useState(initialData?.instructions ?? "");
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>(
    initialData?.ingredients?.length ? initialData.ingredients : [{ ...EMPTY_INGREDIENT }]
  );
  const [protein, setProtein] = useState(
    initialData?.tags?.find((t) => t.type === "PROTEIN")?.value ?? ""
  );
  const [veggie, setVeggie] = useState(
    initialData?.tags?.find((t) => t.type === "VEGGIE")?.value ?? ""
  );
  const [carb, setCarb] = useState(
    initialData?.tags?.find((t) => t.type === "CARB")?.value ?? ""
  );
  const [cuisine, setCuisine] = useState(
    initialData?.tags?.find((t) => t.type === "CUISINE")?.value ?? ""
  );

  function addIngredient() {
    setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT }]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof ParsedIngredient, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const tags: { type: string; value: string }[] = [];
    if (protein && protein !== "none") tags.push({ type: "PROTEIN", value: protein });
    if (veggie && veggie !== "none") tags.push({ type: "VEGGIE", value: veggie });
    if (carb && carb !== "none") tags.push({ type: "CARB", value: carb });
    if (cuisine && cuisine !== "none") tags.push({ type: "CUISINE", value: cuisine });

    onSubmit({
      name,
      sourceUrl: sourceUrl || undefined,
      totalTime: totalTime ? parseInt(totalTime) : undefined,
      activeCookTime: activeCookTime ? parseInt(activeCookTime) : undefined,
      potsAndPans: potsAndPans ? parseInt(potsAndPans) : undefined,
      servings: parseInt(servings) || 2,
      instructions,
      ingredients: ingredients.filter((i) => i.name.trim()),
      tags: tags as { type: import("@prisma/client").TagType; value: string }[],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Recipe Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lemon Herb Chicken"
          required
        />
      </div>

      {/* Source URL */}
      <div className="space-y-1.5">
        <Label htmlFor="sourceUrl">Source URL</Label>
        <Input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Time + Pots */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="totalTime">Total (min)</Label>
          <Input
            id="totalTime"
            type="number"
            min="0"
            value={totalTime}
            onChange={(e) => setTotalTime(e.target.value)}
            placeholder="45"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="activeCookTime">Active (min)</Label>
          <Input
            id="activeCookTime"
            type="number"
            min="0"
            value={activeCookTime}
            onChange={(e) => setActiveCookTime(e.target.value)}
            placeholder="20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="potsAndPans">Pans</Label>
          <Input
            id="potsAndPans"
            type="number"
            min="0"
            value={potsAndPans}
            onChange={(e) => setPotsAndPans(e.target.value)}
            placeholder="2"
          />
        </div>
      </div>

      {/* Servings */}
      <div className="space-y-1.5">
        <Label htmlFor="servings">Servings</Label>
        <Input
          id="servings"
          type="number"
          min="1"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="w-24"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>Tags</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Protein</span>
            <Select value={protein} onValueChange={setProtein}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {PROTEIN_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Cuisine</span>
            <Select value={cuisine} onValueChange={setCuisine}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CUISINE_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Veggie</span>
            <Input
              value={veggie}
              onChange={(e) => setVeggie(e.target.value)}
              placeholder="e.g. broccoli"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Carb</span>
            <Input
              value={carb}
              onChange={(e) => setCarb(e.target.value)}
              placeholder="e.g. rice"
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="space-y-2">
        <Label>Ingredients</Label>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                placeholder="Qty"
                className="w-16 h-9 text-sm"
              />
              <Input
                value={ing.unit ?? ""}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                placeholder="Unit"
                className="w-20 h-9 text-sm"
              />
              <Input
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                placeholder="Ingredient"
                className="flex-1 h-9 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeIngredient(i)}
                disabled={ingredients.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={addIngredient}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add ingredient
        </Button>
        {ingredients.filter((i) => i.name).length > 10 && (
          <p className="text-xs text-amber-600">
            ⚠ {ingredients.filter((i) => i.name).length} ingredients — recipes with ≤10 work best
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="space-y-1.5">
        <Label htmlFor="instructions">Instructions *</Label>
        <p className="text-xs text-muted-foreground">One step per line</p>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={"1. Preheat oven to 400°F\n2. Season chicken with salt and pepper\n3. ..."}
          className="min-h-[160px] text-sm"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
