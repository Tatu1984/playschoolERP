import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { publicService } from "@/backend/services/public.service";
import { cn } from "@/lib/utils";

// "Live seat availability" has to mean it: read the roster every few minutes
// rather than baking a number into the build.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Seat Availability · Climb Kiddo Admissions",
  description: "Live seat availability per program and branch for the 2026-27 session at Climb Kiddo.",
};

export default async function SeatsPage() {
  const [BRANCHES, CLASSROOMS, PROGRAMS] = await Promise.all([
    publicService.branches(),
    publicService.classrooms(),
    publicService.programs(),
  ]);
  const enrolledIn = (branchId: string) =>
    CLASSROOMS.filter((c) => c.branchId === branchId).reduce((n, c) => n + c.enrolled, 0);
  return (
    <>
      <PageHeader
        eyebrow="Admissions"
        title="Seats left for"
        highlight="2026-27"
        description="Updated as enrolments confirm. A waitlisted program can still open up — put your name down and we'll call."
      />

      <section className="mx-auto max-w-6xl space-y-8 px-4 pb-20 sm:px-6 lg:px-8">
        {BRANCHES.map((branch) => {
          const rooms = CLASSROOMS.filter((c) => c.branchId === branch.id);
          return (
            <div key={branch.id}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
                    {branch.name.replace("Climb Kiddo — ", "")}
                  </h2>
                  <p className="text-sm text-ck-navy/60">
                    {branch.address}, {branch.city} · {branch.phone}
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full font-bold">
                  {enrolledIn(branch.id)} enrolled of{" "}
                  {branch.capacity}
                </Badge>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => {
                  const program = PROGRAMS.find((p) => p.slug === room.programSlug);
                  const taken = room.enrolled;
                  const left = Math.max(0, room.capacity - taken);
                  const state = left === 0 ? "full" : left <= 2 ? "few" : "open";
                  return (
                    <Card key={room.id} className="overflow-hidden rounded-3xl border-ck-cream">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                              {program?.emoji} {program?.name}
                            </p>
                            <p className="text-xs text-ck-navy/60">
                              {room.name} · {program?.ageFrom}–{program?.ageTo} yrs
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-bold",
                              state === "full" && "bg-ck-red/10 text-ck-red",
                              state === "few" && "bg-ck-orange/15 text-amber-700",
                              state === "open" && "bg-ck-green/15 text-lime-700",
                            )}
                          >
                            {state === "full" ? "Waitlist" : state === "few" ? `${left} left` : `${left} seats`}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="h-2.5 overflow-hidden rounded-full bg-ck-cream">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                state === "full" ? "bg-ck-red" : state === "few" ? "bg-ck-orange" : "bg-ck-green",
                              )}
                              style={{ width: `${Math.min(100, (taken / room.capacity) * 100)}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-ck-navy/60">
                            {taken} of {room.capacity} filled · {program?.durationLabel}
                          </p>
                        </div>

                        <Button asChild size="sm" className="mt-4 w-full rounded-xl font-bold">
                          <Link href={state === "full" ? "/admissions#enquire" : "/admissions/apply"}>
                            {state === "full" ? "Join the waitlist" : "Apply for this batch"}
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded-3xl bg-ck-navy p-6 text-center text-white sm:p-8">
          <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold">Not sure which batch fits?</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/80">
            Tell us your child&apos;s birthday and we&apos;ll tell you exactly which room they&apos;d join, who their
            teacher would be, and when a seat opens.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild className="rounded-xl bg-white font-bold text-ck-navy hover:bg-white/90">
              <Link href="/admissions#enquire">Ask us</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-white/40 font-bold text-white hover:bg-white/10">
              <Link href="/admissions/visit">Book a visit</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
