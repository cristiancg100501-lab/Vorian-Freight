"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";
import Image from "next/image";
import VorianLogo from "@/assets/vorian_logo.png";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { RealtimeNotifier } from "@/components/realtime-notifier";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setMinLoadingTimeElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const { data: userProfile, isLoading: isProfileLoading } =
    useSupabaseDoc("userProfiles", user?.id);

  const isChecking = isUserLoading || isProfileLoading;
  const isClient = userProfile && (userProfile as any).role === "client";

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }

    if (userProfile && !isClient) {
      router.push(`/${(userProfile as any).role}`);
    }
  }, [isChecking, user, isClient, userProfile, router]);

  const showLoadingOverlay = isChecking || !isClient || !minLoadingTimeElapsed;

  return (
    <div className="h-screen w-full bg-background flex relative overflow-hidden">
      <AnimatePresence>
        {(!mounted || showLoadingOverlay) && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,120,142,0.05)_0%,transparent_50%)]" />
            
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-white/10" />
                  <motion.circle
                    cx="50" cy="50" r="48"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-primary"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </svg>
                
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                  <Image 
                    src={VorianLogo} 
                    alt="Vorian Global Logo" 
                    width={185} 
                    height={55} 
                    className="object-contain animate-pulse relative dark:invert-0 invert" 
                    priority 
                    unoptimized 
                  />
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl font-black tracking-[0.2em] uppercase">Vorian <span className="text-primary">Logistics</span></h2>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-ping" />
                  <p className="text-sm font-medium tracking-widest uppercase text-xs">Cargando tu panel corporativo...</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mounted && (
        <>
          <div className={cn("hidden md:block border-r bg-background transition-all duration-300 h-full", isSidebarCollapsed ? "w-[80px]" : "w-[220px] lg:w-[280px]")}>
            <Sidebar role="client" isCollapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
          </div>
          
          <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
            <Header />
            {user?.id && <RealtimeNotifier clientId={user.id} />}
            
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </div>
        </>
      )}
    </div>
  );
}
