import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseRecipeFromUrl, parseRecipeFromText, parseRecipeFromImage } from "@/lib/claude";
import type { AllowedImageMediaType } from "@/lib/claude";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, url, text, imageData, mediaType } = body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 }
    );
  }

  try {
    if (type === "url") {
      if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
      const recipe = await parseRecipeFromUrl(url);
      return NextResponse.json(recipe);
    }

    if (type === "text") {
      if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
      const recipe = await parseRecipeFromText(text);
      return NextResponse.json(recipe);
    }

    if (type === "image") {
      if (!imageData)
        return NextResponse.json({ error: "imageData is required" }, { status: 400 });
      if (!mediaType || !ALLOWED_MEDIA_TYPES.includes(mediaType))
        return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
      const recipe = await parseRecipeFromImage(imageData, mediaType as AllowedImageMediaType);
      return NextResponse.json(recipe);
    }

    return NextResponse.json({ error: "type must be 'url', 'text', or 'image'" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
