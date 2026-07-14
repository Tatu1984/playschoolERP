/** Admin sidebar navigation. `soon: true` items render disabled (Phase 3+). */
export interface AdminNavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name, resolved in the sidebar component
  soon?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Overview", href: "/admin", icon: "LayoutDashboard" },
  { label: "Cameras", href: "/admin/cameras", icon: "Video" },
  { label: "CCTV Audit", href: "/admin/audit", icon: "ScrollText" },
  { label: "Students", href: "/admin/students", icon: "Users", soon: true },
  { label: "Staff", href: "/admin/staff", icon: "UserCog", soon: true },
  { label: "Fees", href: "/admin/fees", icon: "Wallet", soon: true },
  { label: "Notices", href: "/admin/notices", icon: "Bell", soon: true },
  { label: "Settings", href: "/admin/settings", icon: "Settings", soon: true },
];
