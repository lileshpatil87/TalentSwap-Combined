import { Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-background">
    <header className="landing-header sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center gap-4 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg text-base font-bold tracking-tight text-foreground"><span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"><Sparkles className="size-5"/></span>TalentSwap</Link>
        <nav aria-label="Public" className="ml-auto flex items-center gap-2 sm:gap-3"><a href="/#how-it-works" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground md:inline-flex">How it works</a><a href="/#skills" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground md:inline-flex">Explore skills</a><ThemeToggle/><Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button><Button asChild size="sm" className="rounded-xl px-4 shadow-sm"><Link href="/register">Get started <ArrowUpRight className="size-4"/></Link></Button></nav>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
    <footer className="border-t border-border/70 bg-background"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><Link href="/" className="inline-flex items-center gap-2 font-semibold text-foreground"><Sparkles className="size-4 text-primary"/>TalentSwap</Link><p>Learn generously. Share what you know. Grow together.</p><p>© {new Date().getFullYear()} TalentSwap</p></div></footer>
  </div>;
}
