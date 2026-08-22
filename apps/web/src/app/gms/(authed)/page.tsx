import Link from "next/link";
import { readManifest, isConfigured, CATEGORIES } from "@/lib/gms/gallery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Images, ExternalLink, ArrowRight, Sparkles, Video, Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GmsDashboard() {
  const configured = isConfigured();
  const manifest = configured ? await readManifest() : { items: [] };
  const items = manifest.items;
  const totalPhotos = items.filter((i) => i.contentType.startsWith("image/")).length;
  const totalVideos = items.filter((i) => i.contentType.startsWith("video/")).length;
  const last = items.length
    ? [...items].sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0]
    : null;

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    count: items.filter((i) => i.category === c.value).length,
  }));

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider uppercase text-ck-navy/55">
            Dashboard
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
            Welcome back, admin 👋
          </h1>
        </div>
        <Button
          asChild
          className="rounded-full bg-ck-red hover:bg-ck-red/90 font-bold px-6"
        >
          <Link href="/gms/gallery">
            <Images className="mr-2 h-4 w-4" /> Manage Gallery
          </Link>
        </Button>
      </div>

      {!configured && (
        <Card className="mt-6 rounded-2xl border-0 bg-ck-orange/15">
          <CardContent className="p-5 flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-ck-orange" />
            <div>
              <p className="font-bold text-ck-navy">Storage not configured</p>
              <p className="mt-1 text-sm text-ck-navy/75">
                Connect Vercel Blob (env var{" "}
                <code className="rounded bg-white px-1 py-0.5 text-xs">
                  BLOB_READ_WRITE_TOKEN
                </code>
                ) to start uploading.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard color="#DC2638" label="Total items" value={items.length} icon={<Images className="h-5 w-5" />} />
        <StatCard color="#F39A1E" label="Photos" value={totalPhotos} icon={<ImageIcon className="h-5 w-5" />} />
        <StatCard color="#2BAEEC" label="Videos" value={totalVideos} icon={<Video className="h-5 w-5" />} />
        <StatCard
          color="#8BC53F"
          label="Last upload"
          value={last ? new Date(last.uploadedAt).toLocaleDateString() : "—"}
          icon={<Sparkles className="h-5 w-5" />}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                Recent uploads
              </p>
              <Link
                href="/gms/gallery"
                className="inline-flex items-center gap-1 text-sm font-bold text-ck-red hover:text-ck-red/80"
              >
                See all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="mt-6 text-sm text-ck-navy/75">
                No uploads yet. Head to Gallery to add your first.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {items.slice(0, 8).map((it) =>
                  it.contentType.startsWith("video/") ? (
                    <div
                      key={it.id}
                      className="aspect-square rounded-xl bg-ck-navy flex items-center justify-center text-white"
                    >
                      <Video className="h-6 w-6" />
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={it.id}
                      src={it.url}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
          <CardContent className="p-6">
            <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
              By category
            </p>
            <ul className="mt-4 space-y-2">
              {byCategory.map((c) => (
                <li key={c.value} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ck-navy">{c.label}</span>
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-ck-cream text-ck-navy font-bold"
                  >
                    {c.count}
                  </Badge>
                </li>
              ))}
            </ul>
            <a
              href="/gallery"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-ck-red hover:text-ck-red/80"
            >
              View public gallery <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  color,
  label,
  value,
  icon,
}: {
  color: string;
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            {icon}
          </span>
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-ck-navy/55">
          {label}
        </p>
        <p
          className="mt-1 font-[family-name:var(--font-fredoka)] text-2xl font-bold"
          style={{ color }}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
