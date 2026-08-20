"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import { useHydrated } from "@/frontend/hooks/useHydrated";

/** Scopes every admin list page to one branch (multi-tenant demo of SoW §5.2). */
export function BranchSwitcher() {
  const hydrated = useHydrated();
  const { branches, branchFilter, setBranchFilter } = useBranchScope();

  if (!hydrated) return <Skeleton className="h-12 w-full rounded-xl" />;

  const active = branches.find((b) => b.id === branchFilter);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2 text-left transition hover:bg-muted">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ck-navy/10 text-ck-navy">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{active?.name ?? "All branches"}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {active ? active.city : `${branches.length} branches`}
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Branch scope</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 px-2 py-1.5" onClick={() => setBranchFilter("all")}>
          <span className="flex-1">All branches</span>
          {branchFilter === "all" && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} className="gap-2 px-2 py-1.5" onClick={() => setBranchFilter(b.id)}>
            <span className="flex-1 truncate">{b.name}</span>
            {branchFilter === b.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
