"use client";

import { Footer } from "@/components/layouts/Footer";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/layouts/Navbar";
import { Sidebar } from "@/components/layouts/Sidebar";
import { primaryNavItems, secondaryNavItems } from "@/lib/navigation";

/**
 * (dashboard) route-group layout — the authenticated application shell
 * (FE-CON §6/§7). Composes Sidebar + Navbar + Footer (the only place
 * those three are meant to be composed per FE-CON §7's literal wording;
 * `(admin)`'s equivalent layout reuses the exact same components rather
 * than re-implementing its own chrome — see delivery notes §2).
 *
 * Request-time auth enforcement (redirecting an unauthenticated visitor
 * away from this route group) is intentionally NOT implemented here —
 * see docs/frontend/FE-02-delivery-notes.md §1. This layout is the
 * *authenticated* shell structurally; enforcing that only authenticated
 * users reach it is the Auth module's own `middleware.ts` addition.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
    <div className="flex h-dvh flex-col overflow-hidden bg-background lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar
        items={primaryNavItems}
        footerItems={secondaryNavItems}
        homeHref="/dashboard"
        navLabel="Primary"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          items={primaryNavItems}
          footerItems={secondaryNavItems}
          homeHref="/dashboard"
          navLabel="Primary"
        />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
        <Footer />
      </div>
    </div>
    </AuthGuard>
  );
}
