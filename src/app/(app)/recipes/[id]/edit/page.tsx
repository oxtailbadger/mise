"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeForm } from "@/components/recipe-form";
import { toast } from "sonner";
import type { ParsedRecipe, RecipeWithDetails } from "@/types/recipe";
import Link from "next/link";

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then(setRecipe)
      .catch(() => toast.error("Could not load recipe"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: ParsedRecipe) {
    if (!recipe) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          // Preserve existing GF review results — user can re-import if they want a fresh review
          gfStatus: recipe.gfStatus,
          gfNotes: recipe.gfNotes,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error ?? "Save failed");
      toast.success("Recipe updated!");
      router.push(`/recipes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-muted-foreground mb-3">Recipe not found.</p>
        <Link href="/recipes">
          <Button variant="link">Back to recipes</Button>
        </Link>
      </div>
    );
  }

  // Convert RecipeWithDetails (DB shape) → ParsedRecipe (form shape)
  const initialData: ParsedRecipe = {
    name: recipe.name,
    sourceUrl: recipe.sourceUrl ?? undefined,
    totalTime: recipe.totalTime ?? undefined,
    activeCookTime: recipe.activeCookTime ?? undefined,
    potsAndPans: recipe.potsAndPans ?? undefined,
    servings: recipe.servings,
    instructions: recipe.instructions,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit ?? "",
      notes: ing.notes ?? "",
      isGlutenFlag: ing.isGlutenFlag,
      gfSubstitute: ing.gfSubstitute ?? "",
    })),
    tags: recipe.tags.map((t) => ({ type: t.type, value: t.value })),
  };

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-background border-b border-border z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Edit Recipe</h1>
      </div>

      <div className="px-4 py-4">
        <RecipeForm
          initialData={initialData}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isLoading={saving}
        />
      </div>
    </div>
  );
}
