import { NextRequest, NextResponse } from "next/server";
import {
  CATEGORIES,
  deleteItem,
  updateItem,
  type GalleryCategory,
} from "@/lib/gms/gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATS = new Set(CATEGORIES.map((c) => c.value));

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: {
    caption?: string;
    category?: GalleryCategory;
    sortOrder?: number;
  } = {};
  if (typeof body.caption === "string") patch.caption = body.caption;
  if (typeof body.category === "string" && VALID_CATS.has(body.category)) {
    patch.category = body.category as GalleryCategory;
  }
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
  const updated = await updateItem(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteItem(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
