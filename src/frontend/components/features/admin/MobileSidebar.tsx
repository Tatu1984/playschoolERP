"use client";

import { useState } from "react";
import { PanelLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 md:hidden"
        aria-label="Open menu"
      >
        <PanelLeft className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <AdminSidebar onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
