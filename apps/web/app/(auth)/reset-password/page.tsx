"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { parseApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get('token') ?? ''); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!token) { setError('This reset link is missing its token. Request a new password reset email.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || password.length < 8) { setError('Use at least 8 characters, including uppercase, lowercase and a number.'); return; }
    setLoading(true);
    try { await authApi.resetPassword({ token, password }); router.replace('/login?passwordReset=1'); }
    catch (cause) { setError(parseApiError(cause).message); }
    finally { setLoading(false); }
  };
  return <main className="flex min-h-dvh items-center justify-center bg-muted/20 px-4 py-10"><Card className="w-full max-w-md"><CardHeader><CardTitle>Choose a new password</CardTitle><CardDescription>Reset links expire after 30 minutes and can only be used once.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={(event) => void submit(event)}><div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required/></div><div className="space-y-2"><Label htmlFor="confirm">Confirm new password</Label><Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required/></div>{error && <Alert className="border-destructive/30 text-destructive">{error}</Alert>}<Button className="w-full" disabled={loading}>{loading ? 'Updating…' : 'Reset password'}</Button></form><p className="mt-4 text-center text-sm text-muted-foreground"><Link href="/forgot-password" className="underline">Request another reset link</Link></p></CardContent></Card></main>;
}
