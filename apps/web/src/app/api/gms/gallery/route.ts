import { NextRequest, NextResponse } from "next/server";
import {
  CATEGORIES,
  isConfigured,
  readManifest,
  sortItems,
  uploadItem,
  type GalleryCategory,
} from "@/lib/gms/gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATS = new Set(CATEGORIES.map((c) => c.value));

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ configured: false, items: [] });
  }
  const manifest = await readManifest();
  return NextResponse.json({
    configured: true,
    items: sortItems(manifest.items),
  });
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Storage not configured. Set BLOB_READ_WRITE_TOKEN." },
      { status: 503 },
    );
  }
  const form = await req.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") ?? "");
  const rawCategory = String(form.get("category") ?? "general");
  const category: GalleryCategory = VALID_CATS.has(rawCategory as GalleryCategory)
    ? (rawCategory as GalleryCategory)
    : "general";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  try {
    const item = await uploadItem({ file, caption, category });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
