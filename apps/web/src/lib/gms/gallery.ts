import { put, list, del } from "@vercel/blob";
import crypto from "crypto";

export type GalleryCategory =
  | "classroom"
  | "performance"
  | "events"
  | "outdoor"
  | "celebrations"
  | "general";

export const CATEGORIES: { value: GalleryCategory; label: string }[] = [
  { value: "classroom", label: "Classroom" },
  { value: "performance", label: "Performances" },
  { value: "events", label: "Events" },
  { value: "outdoor", label: "Outdoor" },
  { value: "celebrations", label: "Celebrations" },
  { value: "general", label: "General" },
];

export type GalleryItem = {
  id: string;
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  caption: string;
  category: GalleryCategory;
  sortOrder: number;
  uploadedAt: string;
};

export type Manifest = {
  version: 1;
  items: GalleryItem[];
};

const MANIFEST_PATH = "gallery/_manifest.json";
const ITEMS_PREFIX = "gallery/items/";
const MAX_BYTES = 50 * 1024 * 1024;

export function inferContentType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "m4v"].includes(ext))
    return `video/${ext === "mov" ? "quicktime" : ext}`;
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (["png", "gif", "webp", "avif", "svg", "bmp"].includes(ext))
    return `image/${ext === "svg" ? "svg+xml" : ext}`;
  return "application/octet-stream";
}

export function isConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function fetchManifestUrl(): Promise<string | null> {
  const { blobs } = await list({ prefix: MANIFEST_PATH, limit: 1 });
  const exact = blobs.find((b) => b.pathname === MANIFEST_PATH);
  return exact?.url ?? null;
}

export async function readManifest(): Promise<Manifest> {
  if (!isConfigured()) return { version: 1, items: [] };
  try {
    const url = await fetchManifestUrl();
    if (!url) return { version: 1, items: [] };
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { version: 1, items: [] };
    const data = (await res.json()) as Manifest;
    if (!data || !Array.isArray(data.items)) return { version: 1, items: [] };
    return { version: 1, items: data.items };
  } catch {
    return { version: 1, items: [] };
  }
}

export async function writeManifest(m: Manifest): Promise<void> {
  await put(MANIFEST_PATH, JSON.stringify(m, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

export async function uploadItem(opts: {
  file: File;
  caption?: string;
  category?: GalleryCategory;
}): Promise<GalleryItem> {
  if (!isConfigured()) throw new Error("Storage not configured");
  const { file } = opts;
  if (file.size > MAX_BYTES) throw new Error("File too large (max 50MB)");
  const type = file.type || inferContentType(file.name);
  if (!/^(image|video)\//.test(type))
    throw new Error("Only images and videos are allowed");

  const id = crypto.randomBytes(8).toString("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `${ITEMS_PREFIX}${id}-${safeName}`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: type,
    addRandomSuffix: false,
  });

  const manifest = await readManifest();
  const sortOrder =
    manifest.items.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 10;
  const item: GalleryItem = {
    id,
    url: blob.url,
    pathname: blob.pathname,
    contentType: type,
    size: file.size,
    caption: opts.caption ?? "",
    category: opts.category ?? "general",
    sortOrder,
    uploadedAt: new Date().toISOString(),
  };
  manifest.items.unshift(item);
  await writeManifest(manifest);
  return item;
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<GalleryItem, "caption" | "category" | "sortOrder">>,
): Promise<GalleryItem | null> {
  const manifest = await readManifest();
  const idx = manifest.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  manifest.items[idx] = { ...manifest.items[idx], ...patch };
  await writeManifest(manifest);
  return manifest.items[idx];
}

export async function deleteItem(id: string): Promise<boolean> {
  const manifest = await readManifest();
  const idx = manifest.items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  const item = manifest.items[idx];
  try {
    await del(item.url);
  } catch {
    // ignore — proceed to remove from manifest anyway
  }
  manifest.items.splice(idx, 1);
  await writeManifest(manifest);
  return true;
}

export function sortItems(items: GalleryItem[]): GalleryItem[] {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return b.sortOrder - a.sortOrder;
    return +new Date(b.uploadedAt) - +new Date(a.uploadedAt);
  });
}
