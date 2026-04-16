"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";

export default function DriverLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { data: userProfile, isLoading: isProfileLoading } =
    useSupabaseDoc("userProfiles", user?.id);

  const isChecking = isUserLoading || isProfileLoading;
  const isDriver = userProfile && (userProfile as any).role === "driver";

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }

    if (userProfile && !isDriver) {
      router.push(`/${(userProfile as any).role}`);
    }
  }, [isChecking, user, isDriver, userProfile, router]);

  if (isChecking || !isDriver) {
    return (
      <div className="min-h-screen w-full bg-background flex justify-center items-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className={cn("grid min-h-screen w-full transition-[grid-template-columns] duration-300 ease-in-out", isSidebarCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]")}>
      <Sidebar role="driver" isCollapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
