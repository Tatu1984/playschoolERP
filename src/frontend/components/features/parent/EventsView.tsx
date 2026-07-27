"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, Check, MapPin, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { pastEvents, upcomingEvents } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField } from "@/frontend/components/ui/Field";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import type { SchoolEvent } from "@/shared/types/engagement.types";
import { titleCase } from "@/shared/utils/common.util";
import { formatDateTime, relativeDays } from "@/frontend/utils/formatters";

export function EventsView() {
  const session = useSession();
  const events = useErpStore((s) => s.events);
  const branches = useErpStore((s) => s.branches);
  const rsvp = useErpStore((s) => s.rsvpEvent);
  const cancelRsvp = useErpStore((s) => s.cancelRsvp);

  const [rsvpFor, setRsvpFor] = useState<SchoolEvent | null>(null);
  const [guests, setGuests] = useState("2");

  const upcoming = upcomingEvents(events);
  const past = pastEvents(events);
  const myRsvps = events.filter((e) => e.rsvps.some((r) => r.userId === session.id));

  const card = (e: SchoolEvent, isPast = false) => {
    const mine = e.rsvps.find((r) => r.userId === session.id);
    return (
      <article key={e.id} className="overflow-hidden rounded-3xl border bg-card">
        <div className="flex items-center gap-3 bg-gradient-to-r from-ck-magenta/10 to-ck-orange/10 p-4">
          <span className="text-4xl" aria-hidden>
            {e.coverEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-heading text-base font-bold">{e.title}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {formatDateTime(e.startsAt)} · {relativeDays(e.startsAt)}
            </p>
          </div>
          <Badge variant="outline">{titleCase(e.kind)}</Badge>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">{e.description}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {e.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {e.venue}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(e.endsAt)}
            </span>
            {e.branchId && <span>{branches.find((b) => b.id === e.branchId)?.name}</span>}
            {e.rsvpEnabled && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {e.rsvps.length} families attending
              </span>
            )}
          </div>

          {e.media.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {e.media.map((m) => (
                <span key={m.id} className="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-muted text-3xl" aria-hidden>
                  {m.placeholder ?? "🖼️"}
                </span>
              ))}
            </div>
          )}

          {!isPast && e.rsvpEnabled && (
            <div className="flex flex-wrap items-center gap-2">
              {mine ? (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" /> Going · {mine.guests} guests
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setGuests(`${mine.guests}`);
                      setRsvpFor(e);
                    }}
                  >
                    Change
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      cancelRsvp(e.id, session.id);
                      toast.success("RSVP cancelled");
                    }}
                  >
                    <X /> Can&apos;t make it
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setGuests("2");
                    setRsvpFor(e);
                  }}
                >
                  <CalendarPlus /> RSVP
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toast.success("Added to your calendar")}
              >
                Add to calendar
              </Button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        description="Celebrations, sports days, workshops and parent-teacher meetings."
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Events" }]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Upcoming" value={upcoming.length} accent="magenta" icon={<CalendarDays className="h-4 w-4" />} />
        <KpiCard label="You're attending" value={myRsvps.length} accent="green" />
        <KpiCard label="Past events" value={past.length} accent="navy" />
        <KpiCard
          label="Next one"
          value={upcoming[0] ? relativeDays(upcoming[0].startsAt) : "—"}
          accent="orange"
          sub={upcoming[0]?.title}
        />
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="mine">My RSVPs ({myRsvps.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 pt-4">
          {upcoming.length === 0 ? <EmptyState emoji="🎪" title="Nothing scheduled yet" /> : upcoming.map((e) => card(e))}
        </TabsContent>
        <TabsContent value="mine" className="space-y-4 pt-4">
          {myRsvps.length === 0 ? (
            <EmptyState emoji="🎟️" title="No RSVPs yet" description="RSVP to an upcoming event and it shows up here." />
          ) : (
            myRsvps.map((e) => card(e))
          )}
        </TabsContent>
        <TabsContent value="past" className="space-y-4 pt-4">
          {past.length === 0 ? <EmptyState emoji="📷" title="No past events" /> : past.map((e) => card(e, true))}
        </TabsContent>
      </Tabs>

      <FormDialog
        open={!!rsvpFor}
        onOpenChange={(o) => !o && setRsvpFor(null)}
        title={rsvpFor ? `RSVP — ${rsvpFor.title}` : ""}
        description={rsvpFor ? `${formatDateTime(rsvpFor.startsAt)} · ${rsvpFor.venue}` : undefined}
        submitLabel="Confirm RSVP"
        onSubmit={() => {
          if (!rsvpFor) return false;
          rsvp(rsvpFor.id, session.id, session.name, Number(guests) || 1);
          toast.success(`You're on the list for ${rsvpFor.title}`);
          setRsvpFor(null);
          return true;
        }}
        size="sm"
      >
        <SelectField
          label="How many people are coming?"
          value={guests}
          onChange={setGuests}
          options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: `${n}`, label: `${n} ${n === 1 ? "person" : "people"}` }))}
          hint="Two seats are included with every family; extra seats subject to space."
        />
      </FormDialog>
    </div>
  );
}
