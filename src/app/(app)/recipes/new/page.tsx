"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, ClipboardPaste, PenLine, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeForm } from "@/components/recipe-form";
import { GfReviewStep } from "@/components/gf-review-step";
import { toast } from "sonner";
import type { ParsedRecipe, ParsedIngredient } from "@/types/recipe";
import type { GFStatus } from "@prisma/client";

type Step = "input" | "review" | "saving";

export default function NewRecipePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [activeTab, setActiveTab] = useState("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [editedRecipe, setEditedRecipe] = useState<ParsedRecipe | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // ── Step 1: Parse via Claude ───────────────────────────────────────────────

  async function handleImport(type: "url" | "text") {
    const body =
      type === "url"
        ? { type: "url", url: urlInput }
        : { type: "text", text: textInput };

    setParsing(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setParsedRecipe(data);
      toast.success("Recipe parsed! Review and adjust below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setParsing(false);
    }
  }

  // ── Photo helpers ──────────────────────────────────────────────────────────

  function readFileAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const [prefix, base64] = result.split(",");
        const mediaType = prefix.replace("data:", "").replace(";base64", "");
        resolve({ base64, mediaType });
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Please select a JPEG, PNG, WEBP, or GIF image.");
      e.target.value = "";
      return;
    }
    const MAX_BYTES = 3 * 1024 * 1024; // 3 MB → ~4 MB base64, under Vercel's 4.5 MB limit
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 3 MB or smaller.");
      e.target.value = "";
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  async function handlePhotoImport() {
    if (!photoFile) return;
    setParsing(true);
    try {
      const { base64, mediaType } = await readFileAsBase64(photoFile);
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image", imageData: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setParsedRecipe(data);
      toast.success("Recipe parsed! Review and adjust below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setParsing(false);
    }
  }

  // ── Step 2: RecipeForm confirms/edits parsed data → go to GF review ───────

  function handleFormSubmit(data: ParsedRecipe) {
    setEditedRecipe(data);
    // Mirror edits back into parsedRecipe so the form re-populates correctly if the
    // user clicks Back from GF review — without this it would reset to Claude's original parse
    setParsedRecipe(data);
    setStep("review");
  }

  // ── Step 3: GF review → save to DB ────────────────────────────────────────

  async function handleGfComplete(
    ingredients: ParsedIngredient[],
    gfStatus: GFStatus,
    gfNotes: string
  ) {
    if (!editedRecipe) return;
    setStep("saving");

    const payload = { ...editedRecipe, ingredients, gfStatus, gfNotes };

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error ?? "Save failed");
      toast.success(`"${saved.name}" saved!`);
      router.push(`/recipes/${saved.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      setStep("review");
    }
  }

  // ── GF review step ─────────────────────────────────────────────────────────

  if (step === "review" && editedRecipe) {
    const flaggedCount = editedRecipe.ingredients.filter((i) => i.isGlutenFlag).length;
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-background border-b border-border z-10">
          <button onClick={() => setStep("input")} className="p-1 -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">GF Review</h1>
        </div>
        <div className="px-4 py-4">
          <GfReviewStep
            ingredients={editedRecipe.ingredients}
            initialGfStatus={flaggedCount > 0 ? "NEEDS_REVIEW" : "CONFIRMED_GF"}
            onComplete={handleGfComplete}
            onBack={() => setStep("input")}
          />
        </div>
      </div>
    );
  }

  if (step === "saving") {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Saving recipe…</p>
        </div>
      </div>
    );
  }

  // ── Step 1: Input ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-background border-b border-border z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Add Recipe</h1>
      </div>

      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-5">
            <TabsTrigger value="url" className="gap-1.5 text-xs">
              <Link2 className="h-3.5 w-3.5" /> URL
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5 text-xs">
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5 text-xs">
              <PenLine className="h-3.5 w-3.5" /> Manual
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-1.5 text-xs">
              <Camera className="h-3.5 w-3.5" /> Photo
            </TabsTrigger>
          </TabsList>

          {/* ── URL Import ─────────────────────────────────────────────── */}
          <TabsContent value="url" className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                Paste a link to any recipe page and we&apos;ll parse it automatically.
              </p>
              <Input
                type="url"
                placeholder="https://www.example.com/recipes/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => handleImport("url")}
              disabled={!urlInput || parsing}
            >
              {parsing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing…</>
              ) : (
                "Parse Recipe"
              )}
            </Button>

            {parsedRecipe && activeTab === "url" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">Parsed — review & edit</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <RecipeForm
                  initialData={parsedRecipe}
                  onSubmit={handleFormSubmit}
                />
              </div>
            )}
          </TabsContent>

          {/* ── Text Paste ─────────────────────────────────────────────── */}
          <TabsContent value="text" className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                Copy and paste a recipe from anywhere — we&apos;ll structure it for you.
              </p>
              <Textarea
                placeholder={"Paste recipe text here...\n\nIngredients:\n- 2 cups flour\n...\n\nInstructions:\n1. ..."}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[180px] text-sm"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => handleImport("text")}
              disabled={!textInput.trim() || parsing}
            >
              {parsing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing…</>
              ) : (
                "Parse Recipe"
              )}
            </Button>

            {parsedRecipe && activeTab === "text" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">Parsed — review & edit</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <RecipeForm
                  initialData={parsedRecipe}
                  onSubmit={handleFormSubmit}
                />
              </div>
            )}
          </TabsContent>

          {/* ── Manual Entry ───────────────────────────────────────────── */}
          <TabsContent value="manual">
            <RecipeForm onSubmit={handleFormSubmit} />
          </TabsContent>

          {/* ── Photo Import ───────────────────────────────────────────── */}
          <TabsContent value="photo" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Take a photo or upload an image of a handwritten or printed recipe.
            </p>

            <label
              htmlFor="photo-upload"
              className={[
                "flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed",
                "border-border cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30",
                photoPreviewUrl ? "p-2" : "p-8 gap-2",
              ].join(" ")}
            >
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt="Recipe photo preview"
                  className="max-h-64 w-full object-contain rounded-md"
                />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground text-center">
                    Tap to take a photo or choose from your library
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    JPEG · PNG · WEBP · max 3 MB
                  </span>
                </>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handlePhotoChange}
              />
            </label>

            {photoPreviewUrl && (
              <button
                type="button"
                className="text-xs text-primary underline-offset-4 hover:underline"
                onClick={() => document.getElementById("photo-upload")?.click()}
              >
                Change photo
              </button>
            )}

            <Button
              className="w-full"
              onClick={handlePhotoImport}
              disabled={!photoFile || parsing}
            >
              {parsing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing…</>
              ) : (
                "Parse Recipe"
              )}
            </Button>

            {parsedRecipe && activeTab === "photo" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">Parsed — review & edit</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <RecipeForm initialData={parsedRecipe} onSubmit={handleFormSubmit} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
