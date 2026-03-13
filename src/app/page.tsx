"use client";

import { LogInForm } from "@/components/login-form";
import { Truck } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { doc } from "firebase/firestore";
import { LoginMap } from "@/components/login-map";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "userProfiles", user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc(userProfileRef);

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
    <div className="min-h-screen w-full text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        <div className="flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-3 mb-10 self-start">
              <Truck className="h-7 w-7 text-foreground" />
              <span className="text-xl font-bold">Vorian Logistics</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              ¡Bienvenido!
            </h1>
            <p className="text-muted-foreground mt-2">
              Inicia sesión para continuar en Vorian Logistics.
            </p>
            <LogInForm />
          </div>
        </div>
        <div className="hidden lg:block relative bg-black">
          <LoginMap />
        </div>
      </div>
    </div>
  );
}
