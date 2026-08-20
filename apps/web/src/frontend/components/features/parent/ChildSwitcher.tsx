"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { useErpStore } from "@/frontend/store/erpStore";
import { studentName } from "@/frontend/store/queries";
import { useHydrated } from "@/frontend/hooks/useHydrated";
import { Skeleton } from "@/components/ui/skeleton";

/** Sidebar control for families with more than one child at the school. */
export function ChildSwitcher() {
  const hydrated = useHydrated();
  const { kids, child, select } = useSelectedChild();
  const classrooms = useErpStore((s) => s.classrooms);

  if (!hydrated) return <Skeleton className="h-12 w-full rounded-xl" />;
  if (!child) return null;

  const classroom = classrooms.find((c) => c.id === child.classroomId);

  if (kids.length === 1) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2">
        <span className="text-xl" aria-hidden>
          {child.photoEmoji}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{studentName(child)}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{classroom?.name ?? "—"}</span>
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2 text-left transition hover:bg-muted">
        <span className="text-xl" aria-hidden>
          {child.photoEmoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{studentName(child)}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{classroom?.name ?? "—"}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel>Your children</DropdownMenuLabel>
        {kids.map((kid) => (
          <DropdownMenuItem key={kid.id} className="gap-2 px-2 py-1.5" onClick={() => select(kid.id)}>
            <span aria-hidden>{kid.photoEmoji}</span>
            <span className="flex-1 truncate">{studentName(kid)}</span>
            {kid.id === child.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
