import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * (public) route-group layout — unauthenticated, SEO-relevant surface
 * (FE-CON §6). Deliberately minimal: a light top bar and footer, not a
 * full marketing site — the (public) landing/skill-directory/profile
 * *content* itself belongs to the Public Pages module (Master Plan
 * `FE-15`), not this navigation/shell foundation.
 *
 * This layout intentionally does NOT reuse the (dashboard)/(admin)
 * Sidebar/Navbar — those are explicitly the authenticated shell's chrome
 * (FE-CON §7); the public surface has no sidebar and a much lighter
 * header, so it's composed inline here instead.
 *
 * "Sign in"/"Get started" link to /login and /register, which don't
 * have pages yet (Auth UI module's scope) — see delivery notes §1;
 * clicking them resolves gracefully to the existing not-found.tsx.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            TalentSwap
          </Link>
          <nav aria-label="Public" className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TalentSwap. All rights reserved.</p>
      </footer>
    </div>
  );
}
