"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Menu, Phone, ChevronDown } from "lucide-react";
import { Magnet } from "@/components/reactbits/Magnet";
import { cn } from "@/lib/utils";

type NavLeaf = { label: string; href: string };
type NavGroup = { label: string; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

const isGroup = (n: NavItem): n is NavGroup => "children" in n;

const NAV: NavItem[] = [
  { label: "About", href: "/about" },
  {
    label: "Programs",
    children: [
      { label: "Curriculum", href: "/programs" },
      { label: "Activities", href: "/activities" },
      { label: "Abacus", href: "/abacus" },
      { label: "Teachers Training", href: "/teachers-training" },
    ],
  },
  {
    label: "Admissions",
    children: [
      { label: "How it works", href: "/admissions" },
      { label: "Apply online", href: "/admissions/apply" },
      { label: "Book a visit", href: "/admissions/visit" },
      { label: "Seat availability", href: "/admissions/seats" },
    ],
  },
  {
    label: "Explore",
    children: [
      { label: "Campus tour", href: "/campus-tour" },
      { label: "Events", href: "/events" },
      { label: "Gallery", href: "/gallery" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "Blog", href: "/blog" },
    ],
  },
  { label: "Why Us", href: "/why-us" },
  { label: "Parents", href: "/parents" },
  { label: "Contact Us", href: "/contact" },
];

function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const hide = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          navigationMenuTriggerStyle(),
          "bg-transparent text-ck-navy hover:text-ck-red hover:bg-ck-cream/60 font-semibold gap-1",
          open && "text-ck-red bg-ck-cream/60",
        )}
      >
        {group.label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "absolute left-1/2 top-full -translate-x-1/2 pt-2 transition-all",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none",
        )}
      >
        <div className="min-w-[14rem] rounded-2xl bg-white p-2 shadow-[0_18px_40px_rgba(26,31,75,0.12)] ring-1 ring-ck-navy/5">
          {group.children.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-ck-navy hover:bg-ck-cream hover:text-ck-red"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileGroup({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-3 py-3 text-base font-semibold text-ck-navy hover:bg-ck-cream",
          open && "bg-ck-cream/70",
        )}
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-1 ml-3 border-l-2 border-ck-cream pl-3 flex flex-col">
            {group.children.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-ck-navy/85 hover:bg-ck-cream hover:text-ck-navy"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/85 backdrop-blur-md shadow-[0_4px_24px_rgba(26,31,75,0.06)]"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo size={48} />

        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV.map((n) =>
            isGroup(n) ? (
              <NavDropdown key={n.label} group={n} />
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent text-ck-navy hover:text-ck-red hover:bg-ck-cream/60 font-semibold",
                )}
              >
                {n.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="tel:+917003708969"
            className="hidden md:flex items-center gap-2 rounded-full bg-ck-cream/70 px-4 py-2 text-sm font-bold text-ck-navy hover:bg-ck-cream transition-colors"
          >
            <Phone className="h-4 w-4 text-ck-red" />
            70037 08969
          </a>
          <Magnet className="hidden sm:inline-block">
            <Button
              asChild
              className="rounded-full bg-ck-red hover:bg-ck-red/90 font-bold px-6 shadow-[0_6px_0_#9a1a28] hover:shadow-[0_3px_0_#9a1a28] hover:translate-y-[3px] transition-all"
            >
              <Link href="/admissions/visit">Book a Visit</Link>
            </Button>
          </Magnet>

          <Sheet>
            <SheetTrigger
              aria-label="Open menu"
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-ck-cream/60 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent className="w-80 px-6 py-8 overflow-y-auto">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mb-8">
                <Logo size={42} />
              </div>
              <nav className="flex flex-col gap-1">
                {NAV.map((n) =>
                  isGroup(n) ? (
                    <MobileGroup key={n.label} group={n} />
                  ) : (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="rounded-xl px-3 py-3 text-base font-semibold text-ck-navy hover:bg-ck-cream"
                    >
                      {n.label}
                    </Link>
                  ),
                )}
              </nav>
              <div className="mt-8 space-y-3">
                <a
                  href="tel:+917003708969"
                  className="flex items-center gap-2 rounded-full bg-ck-cream px-4 py-3 text-sm font-bold text-ck-navy"
                >
                  <Phone className="h-4 w-4 text-ck-red" /> 70037 08969
                </a>
                <Button
                  asChild
                  className="w-full rounded-full bg-ck-red hover:bg-ck-red/90"
                >
                  <Link href="/admissions/visit">Book a Visit</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
