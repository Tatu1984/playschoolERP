"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, LayoutPanelLeft, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { ConfirmDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { RowActions } from "@/frontend/components/ui/RowActions";
import type { AccentColor } from "@/shared/types/school.types";
import { ACCENT_SOFT_BG } from "@/frontend/utils/accents";
import type { Banner, CmsPage } from "@/shared/types/learning.types";
import { newId, slugify } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { formatDate } from "@/frontend/utils/formatters";

export function CmsPagesManager() {
  const pages = useErpStore((s) => s.cmsPages);
  const banners = useErpStore((s) => s.banners);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CmsPage | null>(null);
  const [bannerDraft, setBannerDraft] = useState<Banner | null>(null);
  const [bannerIsNew, setBannerIsNew] = useState(false);

  const [draft, setDraft] = useState<CmsPage>({
    id: "",
    slug: "",
    title: "",
    heroHeading: "",
    heroSub: "",
    seoTitle: "",
    seoDescription: "",
    status: "DRAFT",
    sections: [],
    createdAt: "",
  });

  function openCreate() {
    setDraft({
      id: "",
      slug: "",
      title: "",
      heroHeading: "",
      heroSub: "",
      seoTitle: "",
      seoDescription: "",
      status: "DRAFT",
      sections: [],
      createdAt: "",
    });
    setEditing(null);
    setCreating(true);
  }

  function savePage(): boolean {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (editing) {
      patchItem("cmsPages", editing.id, { ...draft, id: editing.id });
      toast.success("Page saved");
    } else {
      addItem("cmsPages", {
        ...draft,
        id: newId("pg"),
        slug: draft.slug || slugify(draft.title),
        createdAt: nowIso(),
      });
      toast.success("Page created");
    }
    setEditing(null);
    setCreating(false);
    return true;
  }

  const columns: Column<CmsPage>[] = [
    {
      key: "title",
      header: "Page",
      sortValue: (p) => p.title,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.title}</p>
          <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
        </div>
      ),
    },
    { key: "hero", header: "Hero heading", hideOnMobile: true, sortValue: (p) => p.heroHeading, cell: (p) => <span className="text-sm">{p.heroHeading}</span> },
    { key: "sections", header: "Sections", hideOnMobile: true, sortValue: (p) => p.sections.length, cell: (p) => p.sections.length },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Content"
        description="Edit the public website copy, SEO metadata and promotional banners without touching code."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Content" }]}
        actions={
          <Button onClick={openCreate}>
            <Plus /> New page
          </Button>
        }
      />

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
          <TabsTrigger value="banners">Banners ({banners.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="pt-4">
          <DataTable
            rows={pages}
            columns={columns}
            rowId={(p) => p.id}
            searchable={(p) => `${p.title} ${p.slug} ${p.heroHeading}`}
            searchPlaceholder="Search pages…"
            onRowClick={(p) => {
              setDraft(p);
              setEditing(p);
            }}
            rowActions={(p) => [
              {
                label: "Edit content",
                icon: <Pencil />,
                onSelect: () => {
                  setDraft(p);
                  setEditing(p);
                },
              },
              {
                label: "Open live page",
                icon: <ExternalLink />,
                onSelect: () => window.open(p.slug === "home" ? "/" : `/${p.slug}`, "_blank"),
              },
              {
                label: p.status === "PUBLISHED" ? "Unpublish" : "Publish",
                icon: <Send />,
                onSelect: () => {
                  patchItem("cmsPages", p.id, { status: p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" });
                  toast.success(p.status === "PUBLISHED" ? "Unpublished" : "Published");
                },
              },
              { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(p) },
            ]}
            emptyTitle="No pages"
            emptyEmoji="📄"
          />
        </TabsContent>

        <TabsContent value="banners" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBannerIsNew(true);
                setBannerDraft({
                  id: "",
                  title: "",
                  subtitle: "",
                  ctaLabel: "Learn more",
                  ctaHref: "/",
                  accent: "red",
                  active: true,
                  startsOn: null,
                  endsOn: null,
                  createdAt: "",
                });
              }}
            >
              <Plus /> New banner
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {banners.map((b) => (
              <SectionCard
                key={b.id}
                title={b.title}
                description={b.subtitle}
                icon={<LayoutPanelLeft className="h-4 w-4" />}
                action={
                  <div className="flex items-center gap-1.5">
                    {b.active ? <Badge variant="secondary">Live</Badge> : <Badge variant="outline">Off</Badge>}
                    <RowActions
                      label="Banner actions"
                      actions={[
                        {
                          label: "Edit",
                          icon: <Pencil />,
                          onSelect: () => {
                            setBannerIsNew(false);
                            setBannerDraft(b);
                          },
                        },
                        {
                          label: b.active ? "Deactivate" : "Activate",
                          onSelect: () => {
                            patchItem("banners", b.id, { active: !b.active });
                            toast.success(b.active ? "Banner off" : "Banner live");
                          },
                        },
                        { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => { removeItem("banners", b.id); toast.success("Banner deleted"); } },
                      ]}
                    />
                  </div>
                }
              >
                <div className={`rounded-xl p-3 text-sm ${ACCENT_SOFT_BG[b.accent]}`}>
                  <p className="font-heading font-bold">{b.title}</p>
                  <p className="text-muted-foreground">{b.subtitle}</p>
                  <Link href={b.ctaHref} className="mt-2 inline-flex text-xs font-semibold text-ck-red hover:underline">
                    {b.ctaLabel} →
                  </Link>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {b.startsOn ? `${formatDate(b.startsOn)} → ${b.endsOn ? formatDate(b.endsOn) : "open"}` : "Always on"}
                </p>
              </SectionCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* page editor */}
      <FormDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        title={editing ? `Edit “${editing.title}”` : "New page"}
        submitLabel="Save page"
        onSubmit={savePage}
        size="xl"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Title" required value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
          <TextField label="Slug" value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: v })} hint="URL path, e.g. about" />
          <TextField label="Hero heading" value={draft.heroHeading} onChange={(v) => setDraft({ ...draft, heroHeading: v })} className="sm:col-span-2" />
          <TextField label="Hero subheading" value={draft.heroSub} onChange={(v) => setDraft({ ...draft, heroSub: v })} className="sm:col-span-2" />
          <TextField label="SEO title" value={draft.seoTitle} onChange={(v) => setDraft({ ...draft, seoTitle: v })} className="sm:col-span-2" hint={`${draft.seoTitle.length}/60 characters`} />
          <TextareaField
            label="SEO description"
            rows={2}
            value={draft.seoDescription}
            onChange={(v) => setDraft({ ...draft, seoDescription: v })}
            className="sm:col-span-2"
            hint={`${draft.seoDescription.length}/160 characters`}
          />
          <SelectField
            label="Status"
            value={draft.status}
            onChange={(v) => setDraft({ ...draft, status: v as CmsPage["status"] })}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "PUBLISHED", label: "Published" },
            ]}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Content sections</p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() =>
                setDraft({
                  ...draft,
                  sections: [...draft.sections, { id: newId("s"), heading: "New section", body: "" }],
                })
              }
            >
              <Plus /> Section
            </Button>
          </div>
          {draft.sections.length === 0 && (
            <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
              No sections yet.
            </p>
          )}
          {draft.sections.map((sec, i) => (
            <div key={sec.id} className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <TextField
                  label={`Section ${i + 1} heading`}
                  value={sec.heading}
                  onChange={(v) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((s) => (s.id === sec.id ? { ...s, heading: v } : s)),
                    })
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="mt-4 text-ck-red"
                  aria-label="Remove section"
                  onClick={() => setDraft({ ...draft, sections: draft.sections.filter((s) => s.id !== sec.id) })}
                >
                  <Trash2 />
                </Button>
              </div>
              <TextareaField
                label="Body"
                rows={3}
                value={sec.body}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.map((s) => (s.id === sec.id ? { ...s, body: v } : s)),
                  })
                }
              />
            </div>
          ))}
        </div>
      </FormDialog>

      {/* banner editor */}
      <FormDialog
        open={!!bannerDraft}
        onOpenChange={(o) => !o && setBannerDraft(null)}
        title={bannerIsNew ? "New banner" : "Edit banner"}
        submitLabel="Save"
        onSubmit={() => {
          if (!bannerDraft || !bannerDraft.title.trim()) {
            toast.error("Title is required");
            return false;
          }
          if (bannerIsNew) {
            addItem("banners", { ...bannerDraft, id: newId("bn"), createdAt: nowIso() });
            toast.success("Banner created");
          } else {
            patchItem("banners", bannerDraft.id, bannerDraft);
            toast.success("Banner updated");
          }
          setBannerDraft(null);
          return true;
        }}
      >
        {bannerDraft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Title" required value={bannerDraft.title} onChange={(v) => setBannerDraft({ ...bannerDraft, title: v })} className="sm:col-span-2" />
            <TextField label="Subtitle" value={bannerDraft.subtitle} onChange={(v) => setBannerDraft({ ...bannerDraft, subtitle: v })} className="sm:col-span-2" />
            <TextField label="CTA label" value={bannerDraft.ctaLabel} onChange={(v) => setBannerDraft({ ...bannerDraft, ctaLabel: v })} />
            <TextField label="CTA link" value={bannerDraft.ctaHref} onChange={(v) => setBannerDraft({ ...bannerDraft, ctaHref: v })} />
            <SelectField
              label="Accent"
              value={bannerDraft.accent}
              onChange={(v) => setBannerDraft({ ...bannerDraft, accent: v as AccentColor })}
              options={["red", "orange", "blue", "green", "magenta", "navy"].map((c) => ({ value: c, label: c }))}
            />
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="The route itself stays in code — only the editable content is removed."
        confirmLabel="Delete page"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("cmsPages", deleting.id);
          toast.success("Page deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}
