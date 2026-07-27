import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin } from "lucide-react";

function Instagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function Facebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}
function Youtube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 16 24 12 24 12s0-4-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-10 bg-ck-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Logo size={56} withWordmark={false} />
              <div>
                <p className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-orange">
                  Climb Kiddo
                </p>
                <p className="text-xs font-semibold tracking-widest text-white/60">
                  DAYCARE · PLAYSCHOOL · KIDS ACTIVITY
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm text-white/70 leading-relaxed">
              A warm, safe, playful home for curious little climbers. Daycare,
              playschool & activity programs designed around early-years
              milestones.
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { icon: Instagram, href: "#", color: "#D4318F" },
                { icon: Facebook, href: "#", color: "#2BAEEC" },
                { icon: Youtube, href: "#", color: "#DC2638" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <a
                    key={i}
                    href={s.href}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                    style={{ backgroundColor: s.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="font-[family-name:var(--font-fredoka)] text-lg font-bold">
              Explore
            </p>
            <ul className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2 text-sm text-white/70">
              {[
                ["Home", "/"],
                ["About", "/about"],
                ["Programs", "/programs"],
                ["Activities", "/activities"],
                ["Abacus", "/abacus"],
                ["Teachers Training", "/teachers-training"],
                ["Gallery", "/gallery"],
                ["Why Us", "/why-us"],
                ["Parents", "/parents"],
                ["Campus Tour", "/campus-tour"],
                ["Events", "/events"],
                ["Testimonials", "/testimonials"],
                ["Blog", "/blog"],
                ["Admissions", "/admissions"],
                ["Book a Visit", "/admissions/visit"],
                ["Careers", "/careers"],
                ["Parent Login", "/login"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-ck-orange transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-[family-name:var(--font-fredoka)] text-lg font-bold">
              Reach us
            </p>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-ck-orange" />
                <a href="tel:+917003708969" className="hover:text-white">
                  70037 08969
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-ck-orange" />
                <a href="tel:+919831440029" className="hover:text-white">
                  98314 40029
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-ck-orange" />
                <a href="mailto:hello@climbkiddo.in" className="hover:text-white">
                  hello@climbkiddo.in
                </a>
              </li>
              <li className="flex items-start gap-2 pt-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ck-orange" />
                <span>
                  Kathgola Branch
                  <br />
                  Dhakuria Branch
                  <br />
                  <span className="text-white/50">Kolkata</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Climb Kiddo. Made with 💛 for little ones.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy#children-s-photographs" className="hover:text-white">Safeguarding</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
