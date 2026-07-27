import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export const metadata = { title: "Page not found · Climb Kiddo" };

const SUGGESTIONS = [
  { href: "/programs", label: "Programs & curriculum", emoji: "📚" },
  { href: "/admissions", label: "Admissions 2026-27", emoji: "📝" },
  { href: "/campus-tour", label: "Campus tour", emoji: "🏫" },
  { href: "/gallery", label: "Photo gallery", emoji: "🖼️" },
  { href: "/blog", label: "Blog", emoji: "✏️" },
  { href: "/contact", label: "Contact us", emoji: "📞" },
];

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="animate-bob text-7xl" aria-hidden>
            🧸
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-fredoka)] text-4xl font-bold text-ck-navy sm:text-5xl">
            This page went out to play
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-ck-navy/70">
            We looked in the ball pit, under the nap mats and behind the art wall. It isn&apos;t there.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild size="lg" className="rounded-xl px-6 py-6 font-bold">
              <Link href="/">
                <Home /> Back home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-6 py-6 font-bold">
              <Link href="/contact">
                <Search /> Tell us what you were looking for
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-2 rounded-2xl border border-ck-cream bg-card p-3 text-left font-bold text-ck-navy transition hover:border-ck-red/30"
              >
                <span className="text-xl" aria-hidden>
                  {s.emoji}
                </span>
                {s.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
