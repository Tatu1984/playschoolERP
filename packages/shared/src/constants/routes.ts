/**
 * Navigation config for every authenticated surface (SoW §8.3–8.6).
 * `icon` is a lucide icon name resolved by `@/frontend/components/layout/navIcons`.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Live counter rendered as a pill in the sidebar / tab bar. */
  badge?: "messages" | "notices" | "fees" | "notifications" | "admissions";
  /** Only highlight on an exact path match (default: prefix match). */
  exact?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: "Overview", href: "/admin", icon: "LayoutDashboard", exact: true },
      { label: "Analytics", href: "/admin/analytics", icon: "ChartLine" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Students", href: "/admin/students", icon: "Users" },
      { label: "Staff", href: "/admin/staff", icon: "UserCog" },
      { label: "Admissions", href: "/admin/admissions", icon: "ClipboardList", badge: "admissions" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Fees", href: "/admin/fees", icon: "Wallet", badge: "fees" },
      { label: "Notices", href: "/admin/notices", icon: "Megaphone" },
      // Not filed under Notices on purpose: a notice is news, a broadcast wakes
      // phones. Somebody looking for the emergency control at speed should not
      // have to guess which tab it is on.
      { label: "Safety broadcasts", href: "/admin/emergency", icon: "Siren" },
      { label: "Events", href: "/admin/events", icon: "CalendarDays" },
      { label: "Cameras", href: "/admin/cameras", icon: "Video" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Pages", href: "/admin/cms", icon: "LayoutPanelLeft", exact: true },
      { label: "Blog", href: "/admin/cms/blog", icon: "Newspaper" },
      { label: "Media library", href: "/admin/cms/media", icon: "Image" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Branches", href: "/admin/branches", icon: "Building2" },
      { label: "Roles", href: "/admin/roles", icon: "ShieldCheck" },
      { label: "Settings", href: "/admin/settings", icon: "Settings" },
      { label: "Audit log", href: "/admin/audit", icon: "ScrollText" },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/teacher", icon: "LayoutDashboard", exact: true },
      { label: "My classes", href: "/teacher/classes", icon: "Users" },
      { label: "Attendance", href: "/teacher/attendance", icon: "ClipboardCheck" },
    ],
  },
  {
    label: "Teaching",
    items: [
      { label: "Activity feed", href: "/teacher/activities", icon: "Camera" },
      { label: "Lesson planner", href: "/teacher/lessons", icon: "BookOpen" },
      { label: "Reports", href: "/teacher/reports", icon: "LineChart" },
    ],
  },
  {
    label: "Communication",
    items: [{ label: "Messages", href: "/teacher/messages", icon: "MessageCircle", badge: "messages" }],
  },
];

export const PARENT_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/parent", icon: "Home", exact: true },
      { label: "Daily feed", href: "/parent/feed", icon: "Camera" },
      { label: "Attendance", href: "/parent/attendance", icon: "ClipboardCheck" },
      { label: "Live camera", href: "/parent/cctv", icon: "Video" },
    ],
  },
  {
    label: "School",
    items: [
      { label: "Notices", href: "/parent/notices", icon: "Megaphone", badge: "notices" },
      { label: "Messages", href: "/parent/messages", icon: "MessageCircle", badge: "messages" },
      { label: "Events", href: "/parent/events", icon: "CalendarDays" },
      { label: "Progress", href: "/parent/reports", icon: "LineChart" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Fees", href: "/parent/payments", icon: "Wallet", badge: "fees" },
      { label: "Emergency", href: "/parent/emergency", icon: "Siren" },
      { label: "Profile", href: "/parent/profile", icon: "UserRound" },
      { label: "Settings", href: "/parent/settings", icon: "Settings" },
    ],
  },
];

/** Bottom tab bar on phones (parent portal — mirrors the mobile app). */
export const PARENT_TABS: NavItem[] = [
  { label: "Home", href: "/parent", icon: "Home", exact: true },
  { label: "Feed", href: "/parent/feed", icon: "Camera" },
  { label: "Live", href: "/parent/cctv", icon: "Video" },
  { label: "Chat", href: "/parent/messages", icon: "MessageCircle", badge: "messages" },
  { label: "Fees", href: "/parent/payments", icon: "Wallet", badge: "fees" },
];

export const KIDS_NAV: NavItem[] = [
  { label: "Home", href: "/kids", icon: "Home", exact: true },
  { label: "Journey", href: "/kids/journey", icon: "Map" },
  { label: "Games", href: "/kids/games", icon: "Gamepad2" },
  { label: "Stories", href: "/kids/stories", icon: "BookOpen" },
  { label: "Draw", href: "/kids/draw", icon: "Palette" },
  { label: "Music", href: "/kids/music", icon: "Music" },
  { label: "Rewards", href: "/kids/rewards", icon: "Trophy" },
];
