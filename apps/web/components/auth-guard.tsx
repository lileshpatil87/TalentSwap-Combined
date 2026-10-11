"use client";
import { useEffect } from "react";
import { usePathname,useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
export function AuthGuard({children}:{children:React.ReactNode}){ const router=useRouter(); const pathname=usePathname(); const {user,hydrated,hydrate}=useAuthStore(); useEffect(()=>{void hydrate();},[hydrate]); useEffect(()=>{if(hydrated&&!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);},[hydrated,user,router,pathname]); if(!hydrated||!user) return <div className="flex min-h-dvh items-center justify-center"><span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" role="status" aria-label="Loading"/></div>; return <>{children}</>; }
