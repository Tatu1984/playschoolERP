import { Skeleton } from "@/components/ui/skeleton";

/** Kid-friendly wait: big friendly blocks, no spinners, no text to read. */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-40 rounded-[2rem]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
