import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVENTS, BRANCHES } from "@/shared/fixtures";
import { titleCase } from "@/shared/utils/common.util";
import { formatDateTime } from "@/frontend/utils/formatters";

export function generateStaticParams() {
  return EVENTS.filter((e) => e.published).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = EVENTS.find((e) => e.slug === slug);
  if (!event) return { title: "Event · Climb Kiddo" };
  return {
    title: `${event.title} · Climb Kiddo`,
    description: event.description.slice(0, 155),
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = EVENTS.find((e) => e.slug === slug && e.published);
  if (!event) notFound();

  const branch = BRANCHES.find((b) => b.id === event.branchId);
  const isPast = event.startsAt < new Date().toISOString();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="font-bold">
        <Link href="/events">
          <ArrowLeft /> All events
        </Link>
      </Button>

      <header className="mt-4 rounded-[2rem] bg-gradient-to-br from-ck-magenta/15 via-ck-orange/10 to-ck-blue/10 p-6 sm:p-8">
        <span className="block text-6xl" aria-hidden>
          {event.coverEmoji}
        </span>
        <Badge variant="secondary" className="mt-3 rounded-full font-bold">
          {titleCase(event.kind)}
        </Badge>
        <h1 className="mt-2 font-[family-name:var(--font-fredoka)] text-3xl font-bold text-ck-navy sm:text-4xl">
          {event.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-ck-navy/70">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {formatDateTime(event.startsAt)} — {formatDateTime(event.endsAt)}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {event.venue}
            </span>
          )}
          {event.rsvpEnabled && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {event.rsvps.length} families attending
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-ck-navy/80">
        <p>{event.description}</p>
        {branch && (
          <p className="text-sm text-ck-navy/60">
            Hosted by {branch.name} · {branch.address}, {branch.city} {branch.pincode}
          </p>
        )}
      </div>

      {event.media.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {event.media.map((m) => (
              <span
                key={m.id}
                className="grid aspect-video place-items-center rounded-2xl bg-ck-cream/60 text-4xl"
                title={m.caption}
                aria-hidden
              >
                {m.placeholder ?? "🖼️"}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-ck-cream p-5">
        {isPast ? (
          <>
            <p className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
              This one has already happened
            </p>
            <p className="mt-1 text-sm text-ck-navy/70">
              Parents can see the full photo album in the app. Not with us yet? Come and visit.
            </p>
          </>
        ) : (
          <>
            <p className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
              {event.rsvpEnabled ? "Parents: RSVP from your portal" : "Save the date"}
            </p>
            <p className="mt-1 text-sm text-ck-navy/70">
              {event.rsvpEnabled
                ? "Sign in to confirm your seats — two per family are included."
                : "No RSVP needed for this one."}
            </p>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {event.rsvpEnabled && !isPast && (
            <Button asChild className="rounded-xl font-bold">
              <Link href="/parent/events">RSVP in the parent portal</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/admissions/visit">Book a school visit</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
