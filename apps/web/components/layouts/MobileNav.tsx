"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isNavItemActive, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  items: NavItem[];
  footerItems?: NavItem[] | undefined;
  homeHref: string;
  navLabel?: string | undefined;
}

interface MobileNavLinkProps {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}

function MobileNavLink({ item, active, onNavigate }: MobileNavLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      {...(active ? { "aria-current": "page" as const } : {})}
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex flex-1 items-center justify-between gap-2 truncate">
        <span className="truncate">{item.label}</span>
        {item.comingSoon ? (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * Mobile primary navigation (FE-CON §29 — collapses to a drawer below
 * `lg`, mirroring `Sidebar`'s desktop tree). Built on the shared `Sheet`
 * primitive (Radix Dialog under the hood), so focus trap, Escape-to-
 * close, and return-focus-on-close all come for free (FE-CON §40).
 */
export function MobileNav({ items, footerItems, homeHref, navLabel }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const resolvedNavLabel = navLabel ?? "Primary";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle asChild>
            <Link href={homeHref} onClick={() => setOpen(false)} className="text-base font-semibold">
              TalentSwap
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav aria-label={resolvedNavLabel} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <MobileNavLink
              key={item.id}
              item={item}
              active={isNavItemActive(pathname, item.href)}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
        {footerItems && footerItems.length > 0 ? (
          <>
            <Separator />
            <div className="space-y-1 px-3 py-3">
              {footerItems.map((item) => (
                <MobileNavLink
                  key={item.id}
                  item={item}
                  active={isNavItemActive(pathname, item.href)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
