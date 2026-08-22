"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GradientText } from "@/components/reactbits/GradientText";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Quote, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Rituparna S.",
    relation: "Mom of Aarav, 3",
    color: "#DC2638",
    body: "My son used to cry every morning. Now he runs to Climb Kiddo. The teachers send me photos of his day — I feel like I'm right there with him.",
  },
  {
    name: "Sourav D.",
    relation: "Dad of Riya, 4",
    color: "#F39A1E",
    body: "We compared four playschools nearby. Climb Kiddo was the only one where Riya wouldn't leave at the end of the visit. That sealed it.",
  },
  {
    name: "Anushka B.",
    relation: "Mom of twins, 2.5",
    color: "#2BAEEC",
    body: "Daycare + playschool in one place means I don't juggle two schedules. The food is fresh, the people are kind. Honestly, a blessing.",
  },
  {
    name: "Devjit M.",
    relation: "Dad of Aarna, 5",
    color: "#8BC53F",
    body: "Aarna's preparation for big school has been smooth. Her phonics, her confidence — all of it grew here. We're so grateful.",
  },
  {
    name: "Priya K.",
    relation: "Mom of Aryan, 2",
    color: "#D4318F",
    body: "What I love most is that the team treats Aryan like their own. He calls his caregiver his second mama. Tells you everything.",
  },
];

export function Testimonials({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="parents" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
              Parent stories
            </Badge>
            <h2 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold text-ck-navy">
              Loved by little climbers &{" "}
              <GradientText>their grown-ups</GradientText>
            </h2>
          </div>
        )}

        <Carousel
          opts={{ align: "start", loop: true }}
          className="mt-12 px-4"
        >
          <CarouselContent className="-ml-4">
            {TESTIMONIALS.map((t) => (
              <CarouselItem
                key={t.name}
                className="pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <Card className="h-full rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
                  <CardContent className="flex h-full flex-col p-7">
                    <div className="flex items-center justify-between">
                      <Quote
                        className="h-8 w-8 opacity-30"
                        style={{ color: t.color }}
                      />
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-ck-orange text-ck-orange"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-5 text-ck-navy/85 leading-relaxed flex-1">
                      “{t.body}”
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        {/* Same reason as the programme badges: initials in navy
                            on a tint, rather than white on a bright hue. */}
                        <AvatarFallback
                          className="text-ck-navy font-bold"
                          style={{ backgroundColor: `${t.color}33` }}
                        >
                          {t.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-ck-navy text-sm">{t.name}</p>
                        <p className="text-xs text-ck-navy/75 font-semibold">
                          {t.relation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-2 bg-white shadow-md" />
          <CarouselNext className="hidden sm:flex -right-2 bg-white shadow-md" />
        </Carousel>
      </div>
    </section>
  );
}
