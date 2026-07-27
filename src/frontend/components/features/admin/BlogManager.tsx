"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, ExternalLink, Newspaper, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { ConfirmDialog, DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { ListField, SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import type { BlogPost } from "@/shared/types/learning.types";
import { formatCompact, newId, slugify, sum } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { formatDate } from "@/frontend/utils/formatters";

const CATEGORIES = ["Parenting", "Learning", "Nutrition", "Child Psychology", "Activities", "Admissions"];

const BLANK: BlogPost = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  category: "Parenting",
  tags: [],
  author: "School Admin",
  coverEmoji: "📝",
  readMinutes: 4,
  status: "DRAFT",
  publishedAt: null,
  views: 0,
  createdAt: "",
};

export function BlogManager() {
  const posts = useErpStore((s) => s.blogPosts);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const [draft, setDraft] = useState<BlogPost>(BLANK);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [previewing, setPreviewing] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState<BlogPost | null>(null);

  function openCreate() {
    setDraft(BLANK);
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: BlogPost) {
    setDraft(p);
    setEditing(p);
    setFormOpen(true);
  }

  function save(): boolean {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error("Title and body are required");
      return false;
    }
    const readMinutes = Math.max(1, Math.round(draft.body.split(/\s+/).length / 200));
    if (editing) {
      patchItem("blogPosts", editing.id, { ...draft, readMinutes });
      toast.success("Post saved");
    } else {
      addItem("blogPosts", {
        ...draft,
        id: newId("bp"),
        slug: draft.slug || slugify(draft.title),
        readMinutes,
        publishedAt: draft.status === "PUBLISHED" ? nowIso() : null,
        createdAt: nowIso(),
      });
      toast.success(draft.status === "PUBLISHED" ? "Post published" : "Draft saved");
    }
    return true;
  }

  const columns: Column<BlogPost>[] = [
    {
      key: "title",
      header: "Post",
      sortValue: (p) => p.title,
      cell: (p) => (
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="text-xl" aria-hidden>
            {p.coverEmoji}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{p.title}</p>
            <p className="truncate text-xs text-muted-foreground">{p.excerpt}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", hideOnMobile: true, sortValue: (p) => p.category, cell: (p) => <Badge variant="outline">{p.category}</Badge> },
    { key: "author", header: "Author", hideOnMobile: true, sortValue: (p) => p.author, cell: (p) => <span className="text-sm">{p.author}</span> },
    { key: "views", header: "Views", hideOnMobile: true, sortValue: (p) => p.views, cell: (p) => <span className="tabular-nums">{formatCompact(p.views)}</span> },
    {
      key: "published",
      header: "Published",
      sortValue: (p) => p.publishedAt ?? "",
      cell: (p) => (p.publishedAt ? <span className="text-sm">{formatDate(p.publishedAt)}</span> : <StatusBadge status="DRAFT" />),
    },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
  ];

  const live = posts.filter((p) => p.status === "PUBLISHED");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Blog"
        description="Parenting and learning articles — the main SEO surface for the school."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Content", href: "/admin/cms" }, { label: "Blog" }]}
        actions={
          <Button onClick={openCreate}>
            <Plus /> New post
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Published" value={live.length} accent="green" icon={<Newspaper className="h-4 w-4" />} />
        <KpiCard label="Drafts" value={posts.length - live.length} accent="muted" />
        <KpiCard label="Total views" value={formatCompact(sum(posts.map((p) => p.views)))} accent="blue" delta={12} />
        <KpiCard
          label="Avg read"
          value={`${Math.round(sum(posts.map((p) => p.readMinutes)) / Math.max(1, posts.length))} min`}
          accent="orange"
        />
      </div>

      <DataTable
        rows={posts}
        columns={columns}
        rowId={(p) => p.id}
        searchable={(p) => `${p.title} ${p.excerpt} ${p.category} ${p.tags.join(" ")}`}
        searchPlaceholder="Search posts…"
        exportName="blog-posts"
        onRowClick={setPreviewing}
        filters={[
          { key: "category", label: "Category", options: CATEGORIES.map((c) => ({ value: c, label: c })), predicate: (p, v) => p.category === v },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "PUBLISHED", label: "Published" },
              { value: "DRAFT", label: "Draft" },
            ],
            predicate: (p, v) => p.status === v,
          },
        ]}
        rowActions={(p) => [
          { label: "Preview", icon: <Eye />, onSelect: () => setPreviewing(p) },
          { label: "Edit", icon: <Pencil />, onSelect: () => openEdit(p) },
          {
            label: "Open live post",
            icon: <ExternalLink />,
            disabled: p.status !== "PUBLISHED",
            onSelect: () => window.open(`/blog/${p.slug}`, "_blank"),
          },
          {
            label: p.status === "PUBLISHED" ? "Unpublish" : "Publish",
            icon: <Send />,
            onSelect: () => {
              patchItem("blogPosts", p.id, {
                status: p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                publishedAt: p.status === "PUBLISHED" ? null : nowIso(),
              });
              toast.success(p.status === "PUBLISHED" ? "Unpublished" : "Published");
            },
          },
          {
            label: "Duplicate",
            icon: <Copy />,
            separatorBefore: true,
            onSelect: () => {
              addItem("blogPosts", {
                ...p,
                id: newId("bp"),
                slug: `${p.slug}-copy`,
                title: `${p.title} (copy)`,
                status: "DRAFT",
                publishedAt: null,
                views: 0,
                createdAt: nowIso(),
              });
              toast.success("Duplicated as draft");
            },
          },
          { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(p) },
        ]}
        emptyTitle="No posts"
        emptyEmoji="📝"
        emptyAction={<Button onClick={openCreate}>New post</Button>}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit post" : "New post"}
        submitLabel="Save"
        onSubmit={save}
        size="xl"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <TextField label="Title" required value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
          <TextField label="Cover emoji" value={draft.coverEmoji} onChange={(v) => setDraft({ ...draft, coverEmoji: v })} />
        </div>
        <TextField label="Slug" value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: v })} hint="Leave blank to generate from the title" />
        <TextareaField label="Excerpt" rows={2} value={draft.excerpt} onChange={(v) => setDraft({ ...draft, excerpt: v })} hint="Shown on the blog index and in search results" />
        <TextareaField
          label="Body"
          required
          rows={12}
          value={draft.body}
          onChange={(v) => setDraft({ ...draft, body: v })}
          hint="Markdown-ish: ## for subheadings, blank lines between paragraphs"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Category"
            value={draft.category}
            onChange={(v) => setDraft({ ...draft, category: v })}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <TextField label="Author" value={draft.author} onChange={(v) => setDraft({ ...draft, author: v })} />
          <ListField label="Tags" values={draft.tags} onChange={(v) => setDraft({ ...draft, tags: v })} />
          <SelectField
            label="Status"
            value={draft.status}
            onChange={(v) => setDraft({ ...draft, status: v as BlogPost["status"] })}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "PUBLISHED", label: "Published" },
            ]}
          />
        </div>
      </FormDialog>

      <DetailDialog
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
        title={previewing ? `${previewing.coverEmoji} ${previewing.title}` : ""}
        description={previewing ? `${previewing.author} · ${previewing.readMinutes} min read · ${previewing.category}` : undefined}
        size="lg"
        footer={
          previewing && (
            <>
              <Button variant="outline" onClick={() => setPreviewing(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const p = previewing;
                  setPreviewing(null);
                  openEdit(p);
                }}
              >
                <Pencil /> Edit
              </Button>
            </>
          )
        }
      >
        {previewing && (
          <article className="space-y-2 text-sm">
            <p className="font-medium text-muted-foreground">{previewing.excerpt}</p>
            {previewing.body.split("\n").map((line, i) =>
              line.startsWith("## ") ? (
                <h3 key={i} className="pt-2 font-heading text-base font-bold">
                  {line.slice(3)}
                </h3>
              ) : line.trim() ? (
                <p key={i}>{line}</p>
              ) : (
                <span key={i} className="block h-1" />
              ),
            )}
          </article>
        )}
      </DetailDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        confirmLabel="Delete post"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("blogPosts", deleting.id);
          toast.success("Post deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}
