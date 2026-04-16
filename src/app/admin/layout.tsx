"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  if (isChecking || !isAdmin) {
    return (
      <div className="min-h-screen w-full bg-background flex">
        {/* Navegación lateral simulada */}
        <div className="w-[80px] md:w-[220px] lg:w-[280px] border-r hidden md:block p-4 space-y-4 pt-10">
          <Skeleton className="h-8 w-8 rounded-md mb-8 mx-auto md:w-3/4 md:mx-0" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Contenido principal simulado */}
        <div className="flex-1 flex flex-col">
          <div className="h-14 lg:h-[60px] border-b p-4 flex justify-end items-center gap-4">
               <Skeleton className="h-8 w-8 rounded-full" />
               <Skeleton className="h-8 w-32 rounded-full hidden lg:block" />
          </div>
          <div className="p-4 lg:p-6 flex-1 flex flex-col gap-6">
               <Skeleton className="h-[120px] w-full rounded-xl" />
               <Skeleton className="flex-1 w-full rounded-xl min-h-[400px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid min-h-screen w-full transition-[grid-template-columns] duration-300 ease-in-out", isSidebarCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]")}>
      <Sidebar role="admin" isCollapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
      <div className="flex flex-col relative overflow-hidden">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-x-hidden">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
