"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, ExternalLink, HardDrive, Image as ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { ConfirmDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField } from "@/frontend/components/ui/Field";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { RowActions } from "@/frontend/components/ui/RowActions";
import type { MediaAsset } from "@/shared/types/learning.types";
import { formatFileSize } from "@/frontend/utils/formatters";
import { newId, sum } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Events", "Campus", "Activities", "About", "Admissions", "Uncategorised"];

const KIND_EMOJI: Record<MediaAsset["kind"], string> = {
  image: "🖼️",
  video: "🎬",
  audio: "🎵",
  document: "📄",
};

export function MediaLibrary() {
  const assets = useErpStore((s) => s.mediaAssets);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState<MediaAsset | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = filter === "all" ? assets : assets.filter((a) => a.category === filter);

  /**
   * Registers an asset record. It does **not** upload the file.
   *
   * This library catalogues the marketing website's media, and those need
   * public URLs — which is what the GMS gallery (`lib/gms/gallery.ts`) stores.
   * The ERP's own upload path deliberately stores privately, because it holds
   * photographs of children, so it is the wrong home for a banner.
   *
   * Until the two are joined up, the honest thing is to say what this does: it
   * makes the entry, and the URL is pasted in afterwards. It used to say
   * "Drop files here to upload" and quietly keep the filename.
   */
  function ingest(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const kind: MediaAsset["kind"] = file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
          ? "audio"
          : file.type.startsWith("image")
            ? "image"
            : "document";
      addItem("mediaAssets", {
        id: newId("ma"),
        label: file.name.replace(/\.[^.]+$/, ""),
        kind,
        category: "Uncategorised",
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        emoji: KIND_EMOJI[kind],
        url: "",
        usedOn: [],
        createdAt: nowIso(),
      });
    });
    toast.success(`${files.length} entr${files.length > 1 ? "ies" : "y"} added — paste the URL to finish`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Media library"
        description="Photos, videos and documents used across the website, notices and events."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Content", href: "/admin/cms" }, { label: "Media" }]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/gms/gallery">
                <ExternalLink /> Public gallery
              </Link>
            </Button>
            <Button onClick={() => inputRef.current?.click()}>
              <Upload /> Add entry
            </Button>
          </>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          ingest(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Assets" value={assets.length} accent="blue" icon={<ImageIcon className="h-4 w-4" />} />
        <KpiCard label="Images" value={assets.filter((a) => a.kind === "image").length} accent="green" />
        <KpiCard label="Videos" value={assets.filter((a) => a.kind === "video").length} accent="magenta" />
        <KpiCard
          label="Storage"
          value={formatFileSize(sum(assets.map((a) => a.sizeKb)))}
          accent="orange"
          icon={<HardDrive className="h-4 w-4" />}
        />
      </div>

      {/* dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          ingest(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 text-center transition",
          dragOver ? "border-ck-red bg-ck-red/5" : "border-border",
        )}
      >
        <p className="text-sm font-medium">Drop files here to catalogue them</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Creates the entry — paste the public URL in afterwards. Images, video, audio and PDFs · or{" "}
          <button type="button" className="font-semibold text-ck-red hover:underline" onClick={() => inputRef.current?.click()}>
            browse
          </button>
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["all", ...CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              filter === c ? "bg-ck-red text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {c === "all" ? "All" : c}
            <span className="ml-1 opacity-60">
              {c === "all" ? assets.length : assets.filter((a) => a.category === c).length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="🖼️" title="Nothing here" description="Add an entry or pick another category." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((asset) => (
            <figure key={asset.id} className="group overflow-hidden rounded-xl border bg-card">
              <div className="grid aspect-video place-items-center bg-muted text-4xl" aria-hidden>
                {asset.emoji}
              </div>
              <figcaption className="space-y-1 p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{asset.label}</p>
                  <RowActions
                    label="Asset actions"
                    actions={[
                      { label: "Rename / recategorise", icon: <Pencil />, onSelect: () => setEditing(asset) },
                      {
                        label: "Copy reference",
                        icon: <Copy />,
                        onSelect: () => {
                          navigator.clipboard?.writeText(`media:${asset.id}`);
                          toast.success("Reference copied");
                        },
                      },
                      { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(asset) },
                    ]}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {asset.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{formatFileSize(asset.sizeKb)}</span>
                </div>
                {asset.usedOn.length > 0 && (
                  <p className="truncate text-[10px] text-muted-foreground">used on {asset.usedOn.join(", ")}</p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <FormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit asset"
        submitLabel="Save"
        onSubmit={() => {
          if (!editing) return false;
          patchItem("mediaAssets", editing.id, { label: editing.label, category: editing.category });
          toast.success("Asset updated");
          setEditing(null);
          return true;
        }}
        size="sm"
      >
        {editing && (
          <>
            <TextField label="Label" value={editing.label} onChange={(v) => setEditing({ ...editing, label: v })} />
            <SelectField
              label="Category"
              value={editing.category}
              onChange={(v) => setEditing({ ...editing, category: v })}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.label}”?`}
        description={deleting?.usedOn.length ? `This asset is used on ${deleting.usedOn.join(", ")}.` : undefined}
        confirmLabel="Delete asset"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("mediaAssets", deleting.id);
          toast.success("Asset deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}
