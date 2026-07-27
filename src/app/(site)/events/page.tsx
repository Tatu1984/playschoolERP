import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EVENTS } from "@/shared/fixtures";
import { titleCase } from "@/shared/utils/common.util";
import { formatDateTime } from "@/frontend/utils/formatters";

export const metadata: Metadata = {
  title: "Events & Calendar · Climb Kiddo",
  description:
    "Annual day, sports day, workshops, field trips and parent-teacher meetings at Climb Kiddo Kolkata.",
};

/** Server-rendered so event dates never disagree between server and client. */
export default function EventsPage() {
  const now = new Date().toISOString();
  const published = EVENTS.filter((e) => e.published);
  const upcoming = published.filter((e) => e.startsAt >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = published.filter((e) => e.startsAt < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="Something is always"
        highlight="about to happen"
        description="Annual day, sports day, workshops for parents and field trips for the children. Everyone is invited to most of it."
      />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
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
            <p className="text-sm text-ck-navy/60">Nothing on the calendar right now — check back soon.</p>
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
      </section>
    </>
  );
}
