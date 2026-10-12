"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isNavItemActive, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

export interface SidebarProps {
  items: NavItem[];
  footerItems?: NavItem[] | undefined;
  homeHref: string;
  backHref?: string | undefined;
  backLabel?: string | undefined;
  navLabel?: string | undefined;
}

interface SidebarLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

function SidebarLink({ item, active, collapsed }: SidebarLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      {...(active ? { "aria-current": "page" as const } : {})}
      {...(collapsed ? { title: item.label } : {})}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-inset ring-primary/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between gap-2 truncate">
          <span className="truncate">{item.label}</span>
          {item.comingSoon ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Soon
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
}

/**
 * Desktop primary navigation (FE-CON §7/§9). Hidden below `lg` — mobile
 * uses `MobileNav`'s Sheet-based drawer instead (FE-CON §29: the
 * sidebar-collapse/drawer shift happens at `lg`).
 *
 * Configured via props (`items`/`homeHref`/`backHref`) rather than
 * hard-coding the dashboard's own nav, specifically so `(admin)` can
 * reuse this exact component instead of a parallel "AdminSidebar"
 * (FE-CON §9's promotion rule — see docs/frontend/FE-02-delivery-notes.md
 * §2 for why that reuse was judged in-bounds).
 */
export function Sidebar({ items, footerItems, homeHref, backHref, backLabel, navLabel }: SidebarProps) {
  const pathname = usePathname();
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const resolvedNavLabel = navLabel ?? "Primary";

  return (
    <div
      className={cn(
        "hidden shrink-0 flex-col border-r border-border/80 bg-background/90 shadow-[8px_0_32px_-28px_hsl(var(--foreground)/0.25)] backdrop-blur-xl transition-[width] duration-200 lg:flex",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border/80 px-4">
        <Link
          href={homeHref}
          className="flex items-center gap-2 overflow-hidden rounded-md text-sm font-bold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Sparkles className="size-4" aria-hidden="true" /></span>
          {!isCollapsed && <span className="truncate">TalentSwap</span>}
        </Link>
      </div>

      {backHref ? (
        <div className="border-b border-border px-3 py-3">
          <Link
            href={backHref}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{backLabel ?? "Back"}</span>}
          </Link>
        </div>
      ) : null}

      <nav aria-label={resolvedNavLabel} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <SidebarLink
            key={item.id}
            item={item}
            active={isNavItemActive(pathname, item.href)}
            collapsed={isCollapsed}
          />
        ))}
      </nav>

      {footerItems && footerItems.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-1 px-3 py-3">
            {footerItems.map((item) => (
              <SidebarLink
                key={item.id}
                item={item}
                active={isNavItemActive(pathname, item.href)}
                collapsed={isCollapsed}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full justify-center"
        >
          {isCollapsed ? (
            <ChevronRight className="size-4" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
