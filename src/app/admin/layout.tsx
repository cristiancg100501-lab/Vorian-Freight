"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";
import Image from "next/image";
import PinkVorianIcon from "@/assets/pinkvorian.png";
import VorianFreightIcon from "@/assets/vorianfreight.png";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Artificial 2s delay to allow the loading circle animation to finish
    const timer = setTimeout(() => setMinLoadingTimeElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);



  const { data: userProfile, isLoading: isProfileLoading } =
    useSupabaseDoc("userProfiles", user?.id);

  const isChecking = isUserLoading || isProfileLoading;
  const isAdmin = userProfile && (userProfile as any).role === "admin";

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }
    
    if (userProfile && !isAdmin) {
      router.push(`/${(userProfile as any).role}`);
    }
  }, [isChecking, user, isAdmin, userProfile, router]);

  const showLoadingOverlay = isChecking || !isAdmin || !minLoadingTimeElapsed;

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
            {/* Simple Radial Background (Fast Performance) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,120,142,0.05)_0%,transparent_50%)]" />
            
            <div className="relative z-10 flex flex-col items-center justify-center">
              {/* Logo con Anillo (Fast SVG Animation without drop-shadow) */}
              <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Anillo de fondo tenue */}
                  <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-white/10" />
                  {/* Anillo principal de carga */}
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
                
                <Image 
                  src={PinkVorianIcon} 
                  alt="Vorian Freight Light" 
                  width={65} 
                  height={65} 
                  className="object-contain block dark:hidden" 
                  priority 
                  unoptimized 
                />
                <Image 
                  src={VorianFreightIcon} 
                  alt="Vorian Freight Dark" 
                  width={65} 
                  height={65} 
                  className="object-contain hidden dark:block" 
                  priority 
                  unoptimized 
                />
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl font-black tracking-[0.2em] uppercase">Vorian <span className="text-primary">Logistics</span></h2>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-ping" />
                  <p className="text-sm font-medium tracking-widest uppercase text-xs">Cargando módulos del sistema...</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout Elements */}
      {mounted && (
        <>
          <div className={cn("hidden md:block border-r bg-card transition-all duration-300", isSidebarCollapsed ? "w-[80px]" : "w-[220px] lg:w-[280px]")}>
            <Sidebar role="admin" isCollapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
          </div>
          
          <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
            <Header user={user} isSidebarCollapsed={isSidebarCollapsed} setSidebarCollapsed={setIsSidebarCollapsed} />
            
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
