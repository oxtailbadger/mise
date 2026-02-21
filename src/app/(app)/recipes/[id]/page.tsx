"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Star, Clock, ChefHat, ExternalLink,
  Pencil, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GfBadge } from "@/components/gf-badge";
import { ServingScaler } from "@/components/serving-scaler";
import { parseInstructions } from "@/lib/recipe-utils";
import { toast } from "sonner";
import type { RecipeWithDetails } from "@/types/recipe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then(setRecipe)
      .catch(() => toast.error("Could not load recipe"))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleFavorite() {
    if (!recipe) return;
    await fetch(`/api/recipes/${id}/favorite`, { method: "POST" });
    setRecipe((r) => r ? { ...r, favorite: !r.favorite } : r);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      toast.success("Recipe deleted");
      router.push("/recipes");
    } catch {
      toast.error("Could not delete recipe");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Link href="/recipes">
          <Button variant="link">Back to recipes</Button>
        </Link>
      </div>
    );
  }

  const steps = parseInstructions(recipe.instructions);
  const proteinTag = recipe.tags.find((t) => t.type === "PROTEIN");
  const veggieTag = recipe.tags.find((t) => t.type === "VEGGIE");
  const carbTag = recipe.tags.find((t) => t.type === "CARB");
  const cuisineTag = recipe.tags.find((t) => t.type === "CUISINE");

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background border-b border-border z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Link href={`/recipes/${id}/edit`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <button onClick={toggleFavorite} className="p-2">
            <Star
              className={`h-5 w-5 transition-colors ${
                recipe.favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5 pb-8">
        {/* Title + meta */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{recipe.name}</h1>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <GfBadge status={recipe.gfStatus} />
            {proteinTag && (
              <Badge variant="secondary" className="capitalize">{proteinTag.value}</Badge>
            )}
            {veggieTag && (
              <Badge variant="secondary" className="capitalize">{veggieTag.value}</Badge>
            )}
            {carbTag && (
              <Badge variant="secondary" className="capitalize">{carbTag.value}</Badge>
            )}
            {cuisineTag && (
              <Badge variant="outline" className="capitalize">{cuisineTag.value}</Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {recipe.totalTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {recipe.totalTime} min
              </span>
            )}
            {recipe.potsAndPans && (
              <span className="flex items-center gap-1">
                <ChefHat className="h-4 w-4" />
                {recipe.potsAndPans} {recipe.potsAndPans === 1 ? "pan" : "pans"}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Serves {recipe.servings}
            </span>
          </div>

          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              View original recipe
            </a>
          )}
        </div>

        <Separator />

        {/* Ingredients with serving scaler */}
        <div className="space-y-3">
          <h2 className="font-semibold text-base">Ingredients</h2>
          <ServingScaler
            originalServings={recipe.servings}
            ingredients={recipe.ingredients}
          />
        </div>

        <Separator />

        {/* Instructions */}
        <div className="space-y-3">
          <h2 className="font-semibold text-base">Instructions</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* GF Notes */}
        {recipe.gfNotes && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <h2 className="font-semibold text-base">GF Notes</h2>
              <p className="text-sm text-muted-foreground">{recipe.gfNotes}</p>
            </div>
          </>
        )}

        {/* Personal Notes */}
        {recipe.notes && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <h2 className="font-semibold text-base">Notes</h2>
              <p className="text-sm text-muted-foreground">{recipe.notes}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Delete */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Recipe
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{recipe.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the recipe. This cannot be undone.
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
