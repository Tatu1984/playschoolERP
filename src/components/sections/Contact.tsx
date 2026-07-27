"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradientText } from "@/components/reactbits/GradientText";
import { Aurora } from "@/components/reactbits/Aurora";
import { EnquiryForm } from "@/frontend/components/features/marketing/EnquiryForm";
import { Phone, MessageCircle, MapPin } from "lucide-react";

export function Contact() {
  return (
    <section id="contact" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden rounded-[2rem] border-0 bg-ck-navy text-white shadow-[0_30px_60px_rgba(26,31,75,0.25)]">
          <Aurora className="opacity-50" />

          <CardContent className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
            <div>
              <Badge className="rounded-full bg-white/15 text-white font-bold px-4 hover:bg-white/20">
                Let&apos;s talk
              </Badge>
              <h2 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold leading-tight">
                Come visit us. <br />
                <GradientText>Bring your little climber.</GradientText>
              </h2>
              <p className="mt-5 max-w-md text-white/80 leading-relaxed">
                The best way to feel Climb Kiddo is to walk through our doors.
                Book a free visit — we&apos;ll show you around and let your child
                play.
              </p>

              <div className="mt-10 space-y-4">
                <a
                  href="tel:+917003708969"
                  className="group flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur p-4 hover:bg-white/15 transition-colors"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ck-red shadow-md">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/60 font-bold">
                      Call us
                    </p>
                    <p className="font-bold">70037 08969 · 98314 40029</p>
                  </div>
                </a>

                <a
                  href="https://wa.me/917003708969"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur p-4 hover:bg-white/15 transition-colors"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ck-green shadow-md">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/60 font-bold">
                      WhatsApp
                    </p>
                    <p className="font-bold">Quick reply, 9 am – 8 pm</p>
                  </div>
                </a>

                <div className="flex items-start gap-4 rounded-2xl bg-white/10 backdrop-blur p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ck-blue shadow-md">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-white/60 font-bold">
                      Two branches in Kolkata
                    </p>
                    <p className="font-bold">Kathgola Branch</p>
                    <p className="font-bold">Dhakuria Branch</p>
                  </div>
                </div>
              </div>
            </div>

            <EnquiryForm />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
