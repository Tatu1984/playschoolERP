import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRANCH_LOCATIONS } from "@/shared/constants/site";

/**
 * Both campuses with an embedded map each.
 *
 * Uses Google's keyless `/maps?output=embed` endpoint — no API key to leak, no
 * billing account to set up, and it degrades to a plain link if the iframe is
 * blocked. Lazy-loaded so it never costs anything above the fold.
 */
export function BranchMaps() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <h2 className="text-center font-[family-name:var(--font-fredoka)] text-3xl font-bold text-ck-navy">
        Two campuses, both easy to reach
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-ck-navy/70">
        Drop in during school hours — no appointment needed for a quick look around.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {BRANCH_LOCATIONS.map((branch) => (
          <Card key={branch.id} className="overflow-hidden rounded-3xl border-ck-cream p-0">
            <CardContent className="p-0">
              <iframe
                title={`Map of ${branch.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(branch.mapQuery)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-64 w-full border-0"
              />
              <div className="space-y-3 p-5">
                <h3 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                  {branch.name}
                </h3>
                <ul className="space-y-1.5 text-sm text-ck-navy/70">
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ck-red" />
                    {branch.address}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-ck-blue" />
                    {branch.hours}
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-ck-green" />
                    <a href={`tel:${branch.phone}`} className="font-bold text-ck-navy hover:text-ck-red">
                      {branch.phone}
                    </a>
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branch.mapQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation /> Directions
                    </a>
                  </Button>
                  <Button asChild size="sm" className="rounded-xl font-bold">
                    <a href={`tel:${branch.phone}`}>
                      <Phone /> Call this branch
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
