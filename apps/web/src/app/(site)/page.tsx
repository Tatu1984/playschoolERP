import { Hero } from "@/components/sections/Hero";
import { Pillars } from "@/components/sections/Pillars";
import { Programs } from "@/components/sections/Programs";
import { Activities } from "@/components/sections/Activities";
import { WhyUs } from "@/components/sections/WhyUs";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Pillars />
      <Programs />
      <Activities />
      <WhyUs />
      <Testimonials />
      <Faq />
      <Contact />
    </>
  );
}
