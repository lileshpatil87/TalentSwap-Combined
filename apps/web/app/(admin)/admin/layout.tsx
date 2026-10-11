"use client";

import { AuthGuard } from "@/components/auth-guard";

import { Footer } from "@/components/layouts/Footer";
import { Navbar } from "@/components/layouts/Navbar";
import { Sidebar } from "@/components/layouts/Sidebar";
import { adminNavItems } from "@/lib/navigation";

/**
 * (admin) route-group layout — reuses the exact same shell chrome as
 * (dashboard) (Sidebar/Navbar/Footer), configured with `adminNavItems`
 * instead of `primaryNavItems` (FE-CON §9 promotion rule — one set of
 * generic, prop-driven chrome components rather than a parallel
 * "AdminSidebar"/"AdminNavbar"). See docs/frontend/FE-02-delivery-notes.md
 * §2 for why this reuse was judged in-bounds relative to FE-CON §7's
 * literal wording ("the (dashboard) layout is the only place ... are
 * composed").
 *
 * Role enforcement (Moderator/Admin only, per FE-CON §6) is out of scope
 * here for the same reason session-gating is out of scope in (dashboard)
 * — see docs/frontend/FE-02-delivery-notes.md §1.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        items={adminNavItems}
        homeHref="/admin"
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        navLabel="Admin"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar items={adminNavItems} homeHref="/admin" navLabel="Admin" />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
        <Footer />
      </div>
    </div>
    </AuthGuard>
  );
}
