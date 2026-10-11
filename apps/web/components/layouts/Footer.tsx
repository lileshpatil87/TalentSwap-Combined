/**
 * Minimal shell footer — composed only inside the (dashboard)/(admin)
 * layouts alongside Sidebar/Navbar (FE-CON §7). Intentionally light:
 * this is app chrome, not a marketing footer. The (public) layout's
 * footer is a separate, simple inline block (see
 * app/(public)/layout.tsx) since it is not part of the authenticated
 * shell this component belongs to.
 */
export function Footer() {
  return (
    <footer className="shrink-0 border-t border-border px-4 py-3 text-center text-xs text-muted-foreground lg:px-6">
      <p>&copy; {new Date().getFullYear()} TalentSwap. All rights reserved.</p>
    </footer>
  );
}
