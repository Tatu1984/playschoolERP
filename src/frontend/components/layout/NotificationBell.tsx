"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useHydrated } from "@/frontend/hooks/useHydrated";
import { timeAgo } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const session = useSession();
  const hydrated = useHydrated();
  const notifications = useErpStore((s) => s.notifications);
  const markRead = useErpStore((s) => s.markNotificationRead);
  const markAllRead = useErpStore((s) => s.markAllNotificationsRead);

  // The demo dataset only ships notifications for the parent persona; staff see
  // theirs once the notification service starts fanning out server-side.
  const mine = notifications.filter((n) => n.userId === session.id || n.userId === "usr_parent");
  const unread = hydrated ? mine.filter((n) => !n.read).length : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" className="relative" />}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ck-red px-0.5 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllRead("usr_parent")}
              className="flex items-center gap-1 text-xs font-medium text-ck-red hover:underline"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {mine.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing new.</p>
          ) : (
            <ul className="divide-y">
              {mine.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href ?? "#"}
                    onClick={() => markRead(n.id)}
                    className={cn("flex gap-2.5 px-3 py-2.5 transition hover:bg-muted", !n.read && "bg-ck-red/5")}
                  >
                    <span className="mt-0.5 text-base" aria-hidden>
                      {n.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ck-red" />}
                      </span>
                      <span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
