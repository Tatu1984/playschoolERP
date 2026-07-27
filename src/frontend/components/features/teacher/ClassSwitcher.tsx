"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import { useErpStore } from "@/frontend/store/erpStore";
import { useHydrated } from "@/frontend/hooks/useHydrated";
import { rosterOf } from "@/frontend/store/queries";

export function ClassSwitcher() {
  const hydrated = useHydrated();
  const { classes, classroom, select } = useSelectedClass();
  const students = useErpStore((s) => s.students);

  if (!hydrated) return <Skeleton className="h-12 w-full rounded-xl" />;
  if (!classroom) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2 text-left transition hover:bg-muted">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ck-blue/20 text-sm font-bold text-sky-700">
          {classroom.name.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{classroom.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {rosterOf(students, classroom.id).length} children
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel>Switch class</DropdownMenuLabel>
        {classes.map((c) => (
          <DropdownMenuItem key={c.id} className="gap-2 px-2 py-1.5" onClick={() => select(c.id)}>
            <span className="flex-1 truncate">{c.name}</span>
            <span className="text-xs text-muted-foreground">{rosterOf(students, c.id).length}</span>
            {c.id === classroom.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
