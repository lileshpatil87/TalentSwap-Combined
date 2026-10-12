import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  Compass,
  FileCheck,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Star,
  User,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Navigation configuration structure (FE-02 — Application Layout &
 * Navigation Foundation). This is the single place a future feature
 * module's route is registered into the shell's Sidebar/MobileNav —
 * neither component reads route information from anywhere else, so
 * adding a module's real page later never requires touching the shell.
 *
 * A static, typed array (rather than a runtime plugin-registration API)
 * is a deliberate choice: Next.js App Router routing is itself static
 * and file-based, and the platform's module list is already closed
 * (Arch §3.2, Master Plan §3.5) — there is no scenario where a route
 * needs registering at runtime. A dynamic registry would be undirected
 * complexity for a fixed, small, known set of items (Arch §10.2, KISS).
 */
export interface NavItem {
  /** Stable id for `key` props — never derived from `label` so relabeling doesn't ripple. */
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Informational only (Master Plan §3.5 module id) — not read by any component logic. */
  module: string;
  /**
   * True until the owning domain module replaces the placeholder page at
   * `href` with real content. Purely a UI hint (renders a "Soon" badge);
   * every item below already resolves to a real, in-shell placeholder
   * route (see `app/(dashboard)/**` / `app/(admin)/admin/**`), so this
   * never causes a broken link — only sets user expectations honestly.
   */
  comingSoon?: boolean | undefined;
}

export const primaryNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard-shell" },
  { id: "discover", label: "Discover", href: "/discover", icon: Compass, module: "discover" },
  { id: "skills", label: "Skills", href: "/skills", icon: Sparkles, module: "skills" },
  {
    id: "exchanges",
    label: "Exchanges",
    href: "/exchanges",
    icon: ArrowLeftRight,
    module: "transactions",
  },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: Wallet, module: "wallet" },
  {
    id: "messages",
    label: "Messages",
    href: "/messages",
    icon: MessageSquare,
    module: "chat",
  },
  {
    id: "community",
    label: "Community",
    href: "/community",
    icon: Users,
    module: "community",
  },
  {
    id: "gamification",
    label: "Achievements",
    href: "/gamification",
    icon: Award,
    module: "gamification",
  },
  { id: "ratings", label: "Ratings", href: "/ratings", icon: Star, module: "ratings" },
  { id: "profile", label: "Profile", href: "/profile", icon: User, module: "profile" },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    icon: FileCheck,
    module: "documents",
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    module: "dashboard-shell",
  },

];

export const adminNavItems: NavItem[] = [
  {
    id: "admin-overview",
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    module: "admin",
  },
  { id: "admin-users", label: "Users", href: "/admin/users", icon: Users, module: "admin" },
  {
    id: "admin-documents",
    label: "Documents",
    href: "/admin/documents",
    icon: FileCheck,
    module: "admin",
  },
  {
    id: "admin-transactions",
    label: "Transactions",
    href: "/admin/transactions",
    icon: ArrowLeftRight,
    module: "admin",
  },
  {
    id: "admin-analytics",
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    module: "admin",
  },
];

/**
 * Active-route matching shared by Sidebar and MobileNav (kept as one
 * function rather than duplicated inline per FE-CON §21.3 — logic is
 * exactly what stays out of duplicated component bodies even where a
 * little JSX duplication elsewhere is an acceptable tradeoff).
 *
 * Exact-match only for a route group's own root (`/dashboard`, `/admin`)
 * so that item doesn't stay highlighted once the user has navigated into
 * a real sub-route; prefix-match for everything else so a future nested
 * route (e.g. `/skills/123/edit`) still highlights its parent nav item.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
