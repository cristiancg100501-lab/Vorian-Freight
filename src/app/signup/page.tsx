"use client";

import { SignUpForm } from "@/components/signup-form";
import { Truck } from "lucide-react";
import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignUpPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const { data: userProfile, isLoading: isProfileLoading } =
    useSupabaseDoc("userProfiles", user?.id);

  useEffect(() => {
    if (!isUserLoading && user && userProfile) {
      router.push(`/${(userProfile as any).role}`);
    }
  }, [user, userProfile, isUserLoading, router]);

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="min-h-screen w-full bg-background flex justify-center items-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        <div className="flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-3 mb-10 self-start">
              <Truck className="h-7 w-7 text-foreground" />
              <span className="text-xl font-bold">Vorian Logistics</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Crea una cuenta
            </h1>
            <p className="text-muted-foreground mt-2">
              Únete a Vorian Logistics hoy para comenzar.
            </p>
            <SignUpForm />
          </div>
        </div>
        <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-muted/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.05),_transparent_40%)]"></div>
          <div className="z-10 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Únete a una red de <br />
              logística global.
            </h2>
            <a href="/">
              <button className="mt-8 bg-primary text-primary-foreground font-semibold py-3 px-8 rounded-md transition-all relative">
                Iniciar Sesión
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-primary opacity-80"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-primary opacity-80"></div>
              </button>
            </a>
          </div>
          <div className="absolute bottom-24 opacity-20">
            <div className="w-64 h-64">
              <svg
                width="250"
                height="250"
                viewBox="0 0 250 250"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M125 237.5L237.5 181.25V68.75L125 12.5L12.5 68.75V181.25L125 237.5Z"
                  stroke="#4A4A4A"
                  strokeWidth="2"
                />
                <path
                  d="M12.5 68.75L125 125L237.5 68.75"
                  stroke="#4A4A4A"
                  strokeWidth="2"
                />
                <path d="M125 125V237.5" stroke="#4A4A4A" strokeWidth="2" />
                <circle cx="125" cy="12.5" r="4" fill="#4A4A4A" />
                <circle cx="237.5" cy="68.75" r="4" fill="#4A4A4A" />
                <circle cx="237.5" cy="181.25" r="4" fill="#4A4A4A" />
                <circle cx="125" cy="237.5" r="4" fill="#4A4A4A" />
                <circle cx="12.5" cy="181.25" r="4" fill="#4A4A4A" />
                <circle cx="12.5" cy="68.75" r="4" fill="#4A4A4A" />
                <circle cx="125" cy="125" r="4" fill="#4A4A4A" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
