import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function KidsNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <span className="block animate-bob text-7xl" aria-hidden>
        🔍
      </span>
      <h1 className="mt-4 font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">
        We can&apos;t find that one
      </h1>
      <p className="mt-2 font-semibold text-ck-navy/60">Maybe it&apos;s hiding. Try a different game!</p>
      <Button size="lg" className="mt-6 h-12 rounded-2xl px-6 font-extrabold" asChild>
        <Link href="/kids/games">See all games</Link>
      </Button>
    </div>
  );
}
