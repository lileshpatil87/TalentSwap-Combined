"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema, registerSchema, forgotPasswordSchema } from "@talentswap/validation";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api/auth";
import { parseApiError } from "@/lib/api";

export function AuthPage({ mode }: { mode: "login" | "register" | "forgot" }) {
  const router = useRouter();
  const auth = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const title = mode === "login" ? "Welcome back" : mode === "register" ? "Create your TalentSwap account" : "Reset your password";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = mode === "login"
      ? loginSchema.safeParse({ email, password })
      : mode === "register"
        ? registerSchema.safeParse({ email, password })
        : forgotPasswordSchema.safeParse({ email });
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Please check your details."); return; }
    if (mode === "register" && password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      if (mode === "forgot") {
        await authApi.forgotPassword({ email });
        setDone(true);
      } else if (mode === "login") {
        await auth.login({ email, password });
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")
          ? requestedNext
          : "/dashboard";
        router.replace(safeNext);
      } else {
        await auth.register({ email, password });
        router.replace("/dashboard");
      }
    } catch (cause) {
      setError(parseApiError(cause).message);
    } finally { setLoading(false); }
  };

  return <main className="auth-shell relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10"><div className="auth-decoration auth-decoration-one"/><div className="auth-decoration auth-decoration-two"/><div className="relative z-10 w-full max-w-md">
    <Link href="/" className="mb-7 flex items-center justify-center gap-2.5 text-lg font-bold tracking-tight"><span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20"><Sparkles className="size-5"/></span>TalentSwap</Link>
    <Card className="auth-card"><CardHeader className="px-7 pt-8 text-center sm:px-8"><div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-6"/></div><CardTitle>{title}</CardTitle><CardDescription>{mode === "login" ? "Exchange what you know for what you want to learn." : mode === "register" ? "Join a community built around useful skill exchanges." : "Enter your email and we’ll send reset instructions."}</CardDescription></CardHeader>
      <CardContent className="px-7 pb-8 sm:px-8">{done ? <div className="space-y-4 text-center"><CheckCircle2 className="mx-auto size-10 text-success"/><p className="text-sm text-muted-foreground">If an account exists for {email}, reset instructions have been requested.</p><Button asChild className="w-full"><Link href="/login">Back to sign in</Link></Button></div> : <form onSubmit={(e) => { void submit(e); }} className="space-y-4" noValidate>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        {mode !== "forgot" && <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} required /></div>}
        {mode === "register" && <div className="space-y-2"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>}
        {error && <Alert className="border-destructive/30 text-destructive">{error}</Alert>}
        <Button className="w-full" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset instructions"}<ArrowRight className="size-4"/></Button>
      </form>}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">{mode !== "login" && <Link className="hover:text-foreground" href="/login">Sign in</Link>}{mode !== "register" && <Link className="hover:text-foreground" href="/register">Create account</Link>}{mode !== "forgot" && <Link className="hover:text-foreground" href="/forgot-password">Forgot password?</Link>}</div>
    </CardContent></Card>
    <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Your account is created and authenticated by the TalentSwap server. If the server is unavailable, sign-in and registration will not create a fake account.</p>
  </div></main>;
}
