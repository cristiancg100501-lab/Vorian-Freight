"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { doc } from "firebase/firestore";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "userProfiles", user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc(userProfileRef);

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

  if (isChecking || !isClient) {
    return (
      <div className="min-h-screen w-full bg-background flex justify-center items-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar role="client" />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
