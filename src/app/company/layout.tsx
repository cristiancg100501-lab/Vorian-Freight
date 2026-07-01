"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import { WelcomeWidget } from "@/components/company/welcome-widget";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const { data: userProfile, isLoading: isProfileLoading } =
    useSupabaseDoc("userProfiles", user?.id);

  const { data: companyProfile, isLoading: isCompanyLoading } =
    useSupabaseDoc("companyProfiles", user?.id);

  const isChecking = isUserLoading || isProfileLoading || isCompanyLoading;
  const isCompany = userProfile && (userProfile as any).role === "company";
  
  // KYC Logc
  const isPending = companyProfile && ((companyProfile as any).status === 'pending' || (companyProfile as any).status === 'rejected');
  const isVerificationPage = pathname === '/company/verificacion';

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }
    
    if (userProfile && !isCompany) {
      router.push(`/${(userProfile as any).role}`);
      return;
    }
    
    // KYC Redirect
    if (isCompany && isPending && !isVerificationPage) {
      router.push("/company/verificacion");
      return;
    }
    
    if (isCompany && !isPending && isVerificationPage) {
       router.push("/company");
       return;
    }
    
  }, [isChecking, user, isCompany, userProfile, router, isPending, isVerificationPage]);

  if (isChecking || !isCompany) {
    return (
      <div className="min-h-screen w-full bg-background flex justify-center items-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid min-h-screen w-full transition-[grid-template-columns] duration-300 ease-in-out", 
      isPending ? "grid-cols-1" : (isSidebarCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]")
    )}>
      {!isPending && (
        <Sidebar role="company" isCollapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
      )}
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {isPending && !isVerificationPage ? (
             <div className="flex h-full items-center justify-center flex-col space-y-4">
               <ShieldAlert className="w-12 h-12 text-amber-500" />
               <h2 className="text-xl font-bold">Cuenta en Revisión</h2>
               <p className="text-muted-foreground text-center max-w-md">Por favor, completa el proceso de verificación para acceder a tu panel.</p>
             </div>
          ) : (
            <>
              {!isPending && <WelcomeWidget />}
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
