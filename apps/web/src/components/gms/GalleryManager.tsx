"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Video,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";

type GalleryItem = {
  id: string;
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  caption: string;
  category: string;
  sortOrder: number;
  uploadedAt: string;
};

type Category = { value: string; label: string };

export function GalleryManager({
  initialItems,
  categories,
  configured,
}: {
  initialItems: GalleryItem[];
  categories: Category[];
  configured: boolean;
}) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [filter, setFilter] = useState<string>("all");
  const [uploadCategory, setUploadCategory] = useState<string>("general");
  const [uploadCaption, setUploadCaption] = useState("");
  const [queue, setQueue] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [confirmDelete, setConfirmDelete] = useState<GalleryItem | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  const onFilesChosen = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) =>
      /^(image|video)\//.test(f.type),
    );
    setQueue((q) => [...q, ...arr]);
  }, []);

  async function startUpload() {
    if (!queue.length) return;
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const file of queue) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caption", uploadCaption);
      fd.append("category", uploadCategory);
      try {
        const res = await fetch("/api/gms/gallery", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          fail++;
          const { error } = await res.json().catch(() => ({ error: "Failed" }));
          toast.error(`${file.name}: ${error}`);
          continue;
        }
        const { item } = await res.json();
        setItems((prev) => [item, ...prev]);
        ok++;
      } catch (e) {
        fail++;
        toast.error(`${file.name}: ${String(e)}`);
      }
    }
    setBusy(false);
    setQueue([]);
    setUploadCaption("");
    if (fileInput.current) fileInput.current.value = "";
    if (ok) toast.success(`Uploaded ${ok} file${ok > 1 ? "s" : ""}`);
    if (fail) toast.error(`${fail} failed`);
  }

  function openEdit(it: GalleryItem) {
    setEditing(it);
    setEditCaption(it.caption);
    setEditCategory(it.category);
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/api/gms/gallery/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: editCaption, category: editCategory }),
    });
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    const { item } = await res.json();
    setItems((prev) => prev.map((p) => (p.id === item.id ? item : p)));
    setEditing(null);
    toast.success("Saved");
  }

  async function deleteNow() {
    if (!confirmDelete) return;
    const res = await fetch(`/api/gms/gallery/${confirmDelete.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success("Deleted");
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider uppercase text-ck-navy/55">
            Gallery
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
            Manage photos & videos
          </h1>
        </div>
        <a
          href="/gallery"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-bold text-ck-red hover:text-ck-red/80"
        >
          View public <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {!configured && (
        <Card className="mt-6 rounded-2xl border-0 bg-ck-orange/15">
          <CardContent className="p-5">
            <p className="font-bold text-ck-navy">Storage not configured</p>
            <p className="mt-1 text-sm text-ck-navy/75">
              Set <code className="rounded bg-white px-1 py-0.5 text-xs">BLOB_READ_WRITE_TOKEN</code> on Vercel to enable uploads.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload zone */}
      <Card className="mt-6 rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
        <CardContent className="p-6 sm:p-8">
          <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
            Upload new media
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="caption" className="font-bold">
                Caption (optional)
              </Label>
              <Input
                id="caption"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="e.g. Annual day rehearsal"
                className="mt-1.5 rounded-xl bg-ck-cream/40 border-ck-cream focus-visible:ring-ck-red"
              />
            </div>
            <div>
              <Label htmlFor="category" className="font-bold">
                Category
              </Label>
              <select
                id="category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-xl bg-ck-cream/40 border border-ck-cream px-3 text-sm font-semibold text-ck-navy outline-none focus:ring-2 focus:ring-ck-red"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label
            htmlFor="files"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onFilesChosen(e.dataTransfer.files);
            }}
            className={cn(
              "mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-ck-cream/30 p-10 text-center transition-colors",
              dragOver
                ? "border-ck-red bg-ck-red/5"
                : "border-ck-cream hover:bg-ck-cream/50",
            )}
          >
            <UploadCloud className="h-8 w-8 text-ck-orange" />
            <p className="font-bold text-ck-navy">
              {queue.length
                ? `${queue.length} file${queue.length > 1 ? "s" : ""} ready`
                : "Click to choose or drop files"}
            </p>
            <p className="text-xs text-ck-navy/60">
              Images & videos · up to 50MB each
            </p>
            <input
              id="files"
              type="file"
              ref={fileInput}
              accept="image/*,video/*"
              multiple
              onChange={(e) => onFilesChosen(e.target.files)}
              className="hidden"
            />
          </label>

          {queue.length > 0 && (
            <ul className="mt-4 space-y-2">
              {queue.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-ck-cream/40 px-3 py-2"
                >
                  {f.type.startsWith("video/") ? (
                    <Video className="h-4 w-4 text-ck-blue" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-ck-magenta" />
                  )}
                  <span className="flex-1 truncate text-sm font-semibold text-ck-navy">
                    {f.name}
                  </span>
                  <span className="text-xs text-ck-navy/60">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    onClick={() =>
                      setQueue((q) => q.filter((_, idx) => idx !== i))
                    }
                    aria-label="Remove"
                    className="text-ck-navy/40 hover:text-ck-red"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button
            onClick={startUpload}
            disabled={!queue.length || busy || !configured}
            className="mt-5 w-full sm:w-auto rounded-full bg-ck-red hover:bg-ck-red/90 font-bold px-6 py-5 disabled:opacity-50"
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            {busy ? "Uploading…" : `Upload ${queue.length || ""}`.trim()}
          </Button>
        </CardContent>
      </Card>

      {/* Filter chips */}
      <div className="mt-10 flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-ck-navy/60" />
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
            filter === "all"
              ? "bg-ck-navy text-white"
              : "bg-white text-ck-navy/75 hover:text-ck-navy",
          )}
        >
          All ({items.length})
        </button>
        {categories.map((c) => {
          const n = items.filter((i) => i.category === c.value).length;
          return (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                filter === c.value
                  ? "bg-ck-red text-white"
                  : "bg-white text-ck-navy/75 hover:text-ck-navy",
              )}
            >
              {c.label} ({n})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.length === 0 ? (
          <p className="col-span-full rounded-2xl bg-white p-10 text-center text-sm text-ck-navy/60 shadow-[0_4px_18px_rgba(26,31,75,0.05)]">
            No items {filter === "all" ? "yet" : "in this category"}.
          </p>
        ) : (
          visible.map((it) => (
            <Card
              key={it.id}
              className="group rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)] overflow-hidden"
            >
              <div className="relative aspect-video bg-ck-navy/5">
                {it.contentType.startsWith("video/") ? (
                  <video
                    src={it.url}
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={it.url}
                    alt={it.caption}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
                <Badge
                  variant="secondary"
                  className="absolute left-2 top-2 rounded-full bg-white/90 backdrop-blur text-ck-navy font-bold gap-1"
                >
                  {it.contentType.startsWith("video/") ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <ImageIcon className="h-3 w-3" />
                  )}
                  {categories.find((c) => c.value === it.category)?.label ??
                    it.category}
                </Badge>
              </div>
              <CardContent className="p-4">
                <p className="font-semibold text-ck-navy text-sm line-clamp-2 min-h-[2.5rem]">
                  {it.caption || (
                    <span className="text-ck-navy/40 italic">No caption</span>
                  )}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    onClick={() => openEdit(it)}
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-ck-navy/75 hover:bg-ck-cream hover:text-ck-navy"
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    onClick={() => setConfirmDelete(it)}
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-ck-red/75 hover:bg-ck-red/10 hover:text-ck-red"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-fredoka)] text-2xl">
              Edit item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-caption" className="font-bold">
                Caption
              </Label>
              <Input
                id="edit-caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="edit-category" className="font-bold">
                Category
              </Label>
              <select
                id="edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-xl bg-ck-cream/40 border border-ck-cream px-3 text-sm font-semibold text-ck-navy outline-none focus:ring-2 focus:ring-ck-red"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditing(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              className="rounded-full bg-ck-red hover:bg-ck-red/90 font-bold"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-fredoka)] text-2xl">
              Delete this item?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ck-navy/75">
            This will permanently remove the file from storage. This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteNow}
              className="rounded-full bg-ck-red hover:bg-ck-red/90 font-bold"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
