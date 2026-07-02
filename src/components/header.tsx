"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Bell, Moon, Sun, Package, Truck } from "lucide-react";
import { useSupabase, useUser } from "./providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getCustomerBadge, getCompanyBadge } from "@/lib/badges";

export function Header() {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [completedTrips, setCompletedTrips] = useState<number | null>(null);

  const { data: userProfile } = useSupabaseDoc("userProfiles", user?.id);
  const { data: companyProfile } = useSupabaseDoc("companyProfiles", user?.id);
  const { data: clientProfile } = useSupabaseDoc("clientProfiles", user?.id);

  // Consultar envíos completados
  useEffect(() => {
    if (!user || !supabase) return;
    let isMounted = true;

    const fetchTrips = async () => {
      // 1. Obtener rol
      const { data: profile } = await supabase
        .from("userProfiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (!profile || !isMounted) return;
      const role = profile.role;

      if (role === "client" || role === "customer") {
        const { count } = await supabase
          .from("shipments")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", user.id)
          .eq("status", "COMPLETED");
        if (isMounted) setCompletedTrips(count || 0);
      } else if (role === "company") {
        const { data: drivers } = await supabase
          .from("driverProfiles")
          .select("id")
          .eq("companyId", user.id);
        
        const driverIds = drivers?.map((d: any) => d.id) || [];
        if (driverIds.length > 0) {
          const { count } = await supabase
            .from("shipments")
            .select("id", { count: "exact", head: true })
            .in("driver_id", driverIds)
            .eq("status", "COMPLETED");
          if (isMounted) setCompletedTrips(count || 0);
        } else {
          if (isMounted) setCompletedTrips(0);
        }
      }
    };

    fetchTrips();
    return () => { isMounted = false; };
  }, [user, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };


  let displayName = userProfile ? ((userProfile as any).name || `${(userProfile as any).firstName || ''} ${(userProfile as any).lastName || ''}`.trim()) : "Cargando...";
  
  if (companyProfile && (companyProfile as any).companyName) {
    displayName = (companyProfile as any).companyName;
  } else if (clientProfile && (clientProfile as any).companyName) {
    displayName = (clientProfile as any).companyName;
  }

  let displayRole = userProfile ? (userProfile as any).role.charAt(0).toUpperCase() + (userProfile as any).role.slice(1) : "";
  if (displayRole === 'Company') displayRole = 'Transportista (Flota)';
  if (displayRole === 'Client' || displayRole === 'Customer') displayRole = 'Generador de Carga (B2B)';

  const isDarkMode = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  // Determinar insignia activa
  const role = userProfile ? (userProfile as any).role : null;
  const badge = completedTrips !== null && role
    ? ((role === "client" || role === "customer") ? getCustomerBadge(completedTrips) : role === "company" ? getCompanyBadge(completedTrips) : null)
    : null;


  return (
    <header className="flex h-14 items-center justify-end gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <div className="flex items-center gap-2">
        <Sun className="h-5 w-5" />
        <Switch
          id="theme-switcher"
          checked={isDarkMode}
          onCheckedChange={toggleTheme}
          aria-label="Toggle dark mode"
        />
        <Moon className="h-5 w-5" />
      </div>
      <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notificaciones</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-auto w-auto flex items-center gap-3 px-3 rounded-full hover:bg-muted transition-colors">
            <Image
              src="https://picsum.photos/seed/1/32/32"
              width={32}
              height={32}
              alt="User avatar"
              className="rounded-full"
              data-ai-hint="user avatar"
              referrerPolicy="no-referrer"
            />
            <div className="text-left hidden lg:block mr-1">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                {displayName}
              </div>
              <div className="text-[10px] text-muted-foreground">{displayRole}</div>
            </div>

            {/* Insignia / Badge con Tooltip */}
            {badge && badge.name !== "Sin Rango" && (
              <div className="group relative flex items-center justify-center shrink-0">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border text-white transition-all duration-300 group-hover:scale-110",
                  badge.className,
                  badge.glowClass
                )}>
                  {role === "client" ? (
                    <Package className="h-3 w-3" />
                  ) : (
                    <Truck className="h-3 w-3" />
                  )}
                </div>
                
                {/* Floating interactive tooltip */}
                <div className="absolute right-0 top-8 w-60 p-3 bg-card border rounded-xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-200 z-50 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white", badge.className)}>
                      {role === "client" ? <Package className="h-2.5 w-2.5" /> : <Truck className="h-2.5 w-2.5" />}
                    </div>
                    <p className="text-xs font-black text-foreground">{badge.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {role === "client" ? "Socio Vorian" : "Flota Certificada"} • {completedTrips} {completedTrips === 1 ? "viaje" : "viajes"}
                  </p>
                  
                  {badge.nextThreshold ? (
                    <div className="mt-2 pt-2 border-t text-[9px] text-foreground">
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Siguiente nivel</span>
                        <span>{completedTrips} / {badge.nextThreshold}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div 
                          className="bg-primary h-1 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (completedTrips / badge.nextThreshold) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-yellow-500 font-bold mt-2 pt-2 border-t flex items-center gap-1">
                      🏆 Rango Máximo alcanzado
                    </p>
                  )}
                </div>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border text-popover-foreground">
          <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border"/>
          <DropdownMenuItem className="focus:bg-accent cursor-pointer">Perfil</DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-accent cursor-pointer">Configuración</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border"/>
          <DropdownMenuItem onClick={handleSignOut} className="focus:bg-accent cursor-pointer">Cerrar Sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
