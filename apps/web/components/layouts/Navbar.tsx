"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { MobileNav } from "@/components/layouts/MobileNav";
import { UserNav } from "@/components/layouts/UserNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import type { NavItem } from "@/lib/navigation";

export interface NavbarProps {
  items: NavItem[];
  footerItems?: NavItem[] | undefined;
  homeHref: string;
  navLabel?: string | undefined;
}

/**
 * Sticky top bar composed only inside the (dashboard)/(admin) shell
 * layouts, alongside Sidebar/Footer (FE-CON §7). Owns: the mobile nav
 * trigger, a mobile-only brand mark (desktop's brand lives in Sidebar),
 * theme toggle, and account menu.
 *
 * Also owns focus management on client-side route changes (FE-CON §40):
 * moves focus to the `#main-content` landmark after a navigation
 * completes, mirroring the route-announcer behavior the Pages Router
 * provided automatically and the App Router does not. Skipped on the
 * very first render so it never steals focus from the initial page load.
 */
export function Navbar({ items, footerItems, homeHref, navLabel }: NavbarProps) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const main = document.getElementById("main-content");
    main?.focus();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-background/80 px-4 shadow-[0_4px_24px_-24px_hsl(var(--foreground)/0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <MobileNav items={items} footerItems={footerItems} homeHref={homeHref} navLabel={navLabel} />
      <Link
        href={homeHref}
        className="rounded-md text-sm font-bold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
      >
        TalentSwap
      </Link>
      {/* Notification bell slot — added here by the Notifications module
          (FE-07, Master Plan §3.5) once it exists; intentionally absent
          from this foundation module (task scope explicitly excludes
          notification functionality). */}
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
