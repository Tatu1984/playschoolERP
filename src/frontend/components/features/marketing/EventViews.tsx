"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { useLiveContent } from "@/frontend/hooks/useLiveContent";
import { useHydrated } from "@/frontend/hooks/useHydrated";
import type { SchoolEvent } from "@/shared/types/engagement.types";
import type { Branch } from "@/shared/types/school.types";
import { titleCase } from "@/shared/utils/common.util";
import { formatDateTime } from "@/frontend/utils/formatters";

function usePublished(initial: SchoolEvent[]): SchoolEvent[] {
  const events = useLiveContent(initial, (s) => s.events);
  return events.filter((e) => e.published);
}

export function PublicEventsView({ initial }: { initial: SchoolEvent[] }) {
  const hydrated = useHydrated();
  const published = usePublished(initial);

  // Split by "now" only after hydration; on the server this renders the same
  // order as the client's first paint.
  const now = new Date().toISOString();
  const upcoming = published
    .filter((e) => e.startsAt >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = published.filter((e) => e.startsAt < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <>
      <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">Coming up</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {upcoming.map((e) => (
          <Card key={e.id} className="overflow-hidden rounded-3xl border-ck-cream transition hover:shadow-lg">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 bg-gradient-to-r from-ck-magenta/10 to-ck-orange/10 p-5">
                <span className="text-5xl" aria-hidden>
                  {e.coverEmoji}
                </span>
                <div className="min-w-0">
                  <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                    {titleCase(e.kind)}
                  </Badge>
                  <h3 className="mt-1 font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                    {e.title}
                  </h3>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <p className="text-sm leading-relaxed text-ck-navy/70">{e.description}</p>
                <div className="flex flex-wrap gap-3 text-xs font-medium text-ck-navy/60">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(e.startsAt)}
                  </span>
                  {e.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {e.venue}
                    </span>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                  <Link href={`/events/${e.slug}`}>
                    Details {e.rsvpEnabled ? "& RSVP" : ""} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-ck-navy/60">
            {hydrated ? "Nothing on the calendar right now — check back soon." : "Loading the calendar…"}
          </p>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-14 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
            Recently at Climb Kiddo
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-ck-cream bg-card p-4 transition hover:border-ck-red/30"
              >
                <span className="text-3xl" aria-hidden>
                  {e.coverEmoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-ck-navy">{e.title}</span>
                  <span className="block text-xs text-ck-navy/60">{formatDateTime(e.startsAt)}</span>
                  {e.media.length > 0 && (
                    <span className="text-xs font-bold text-ck-red">{e.media.length} photos</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function PublicEventDetail({
  slug,
  initial,
  branches,
}: {
  slug: string;
  initial: SchoolEvent[];
  branches: Branch[];
}) {
  const published = usePublished(initial);
  const event = published.find((e) => e.slug === slug);

  if (!event) {
    return (
      <EmptyState
        emoji="🎪"
        title="Event not found"
        description="It may have been unpublished or renamed."
        action={
          <Button asChild>
            <Link href="/events">All events</Link>
          </Button>
        }
      />
    );
  }

  const branch = branches.find((b) => b.id === event.branchId);
  const isPast = event.startsAt < new Date().toISOString();

  return (
    <>
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
    </>
  );
}
