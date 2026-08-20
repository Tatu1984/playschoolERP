"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { GradientText } from "@/components/reactbits/GradientText";

const FAQS = [
  {
    q: "What ages do you accept?",
    a: "We welcome children from 12 months through Senior KG (around 5.5 years). Our daycare runs full-day and our playschool runs in the morning — many families combine both.",
  },
  {
    q: "What are your timings?",
    a: "Playschool: 9:00 am – 12:30 pm. Daycare: 8:00 am – 7:00 pm, flexible half/full/extended slots. Activity classes run evenings and weekends.",
  },
  {
    q: "How safe is the campus?",
    a: "Every room is CCTV monitored 24/7, our team is first-aid trained, and only verified guardians can pick up your child. We share daily updates with photos through our parent app.",
  },
  {
    q: "Do you provide meals?",
    a: "Yes — freshly cooked, dietician-approved meals and snacks. We accommodate dietary restrictions and allergies with prior notice.",
  },
  {
    q: "How do I enroll?",
    a: "Just click ‘Book a Visit’ above, give us a quick call, or fill the contact form. We’ll schedule a tour and walk you through admissions step by step.",
  },
  {
    q: "Can I tour the school first?",
    a: "Absolutely — and we encourage it. Bring your child along and let them play in our spaces before deciding.",
  },
];

export function Faq() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
            FAQs
          </Badge>
          <h2 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold text-ck-navy">
            Questions parents <GradientText>often ask</GradientText>
          </h2>
        </div>

        <Accordion className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              className="rounded-2xl border-0 bg-white px-5 shadow-[0_4px_18px_rgba(26,31,75,0.06)]"
            >
              <AccordionTrigger className="py-5 font-[family-name:var(--font-fredoka)] text-lg font-semibold text-ck-navy hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-ck-navy/75 leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
