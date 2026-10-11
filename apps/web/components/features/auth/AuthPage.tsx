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
import { NetworkError, parseApiError } from "@/lib/api";
import { isNetworkFallbackEnabled } from "@/lib/api/mode";

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
        router.replace(new URLSearchParams(window.location.search).get("next") || "/dashboard");
      } else {
        await auth.register({ email, password });
        router.replace("/dashboard");
      }
    } catch (cause) {
      if (cause instanceof NetworkError && isNetworkFallbackEnabled()) {
        setError("The API is unavailable, so demo fallback is disabled for this request. Start the backend or enable NEXT_PUBLIC_DEMO_FALLBACK.");
      } else setError(parseApiError(cause).message);
    } finally { setLoading(false); }
  };

  return <main className="flex min-h-dvh items-center justify-center bg-muted/20 px-4 py-10"><div className="w-full max-w-md">
    <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold"><Sparkles className="size-5 text-primary"/>TalentSwap</Link>
    <Card><CardHeader className="text-center"><CardTitle>{title}</CardTitle><CardDescription>{mode === "login" ? "Exchange what you know for what you want to learn." : mode === "register" ? "Join a community built around useful skill exchanges." : "Enter your email and we’ll send reset instructions."}</CardDescription></CardHeader>
      <CardContent>{done ? <div className="space-y-4 text-center"><CheckCircle2 className="mx-auto size-10 text-success"/><p className="text-sm text-muted-foreground">If an account exists for {email}, reset instructions have been requested.</p><Button asChild className="w-full"><Link href="/login">Back to sign in</Link></Button></div> : <form onSubmit={(e) => { void submit(e); }} className="space-y-4" noValidate>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        {mode !== "forgot" && <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} required /></div>}
        {mode === "register" && <div className="space-y-2"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>}
        {error && <Alert className="border-destructive/30 text-destructive">{error}</Alert>}
        <Button className="w-full" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset instructions"}<ArrowRight className="size-4"/></Button>
      </form>}
      <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">{mode !== "login" && <Link className="hover:text-foreground" href="/login">Sign in</Link>}{mode !== "register" && <Link className="hover:text-foreground" href="/register">Create account</Link>}{mode !== "forgot" && <Link className="hover:text-foreground" href="/forgot-password">Forgot password?</Link>}</div>
    </CardContent></Card>
    <p className="mt-4 text-center text-xs text-muted-foreground">Live API first. If the API is unreachable and demo fallback is enabled, the app remains runnable with local demo data.</p>
  </div></main>;
}
