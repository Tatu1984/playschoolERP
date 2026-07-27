"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Renders in red and after a separator. */
  destructive?: boolean;
  disabled?: boolean;
  /** Starts a new visual group above this item. */
  separatorBefore?: boolean;
}

/**
 * The "⋯" menu used on every table row and card in the portals.
 * Actions are plain callbacks so pages stay declarative.
 */
export function RowActions({
  actions,
  label = "Row actions",
  align = "end",
  className,
}: {
  actions: RowAction[];
  label?: string;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const visible = actions.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", className)} />}
        aria-label={label}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48 min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {visible.map((action, i) => (
          <div key={action.label}>
            {(action.separatorBefore || (action.destructive && i > 0 && !visible[i - 1]?.destructive)) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              variant={action.destructive ? "destructive" : "default"}
              disabled={action.disabled}
              onClick={action.onSelect}
              className="gap-2 px-2 py-1.5"
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
