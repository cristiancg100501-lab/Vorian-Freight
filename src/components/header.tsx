"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Bell, Moon, Sun, Package, Truck, Lock, CheckCircle2, Award } from "lucide-react";
import { useSupabase, useUser } from "./providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getCustomerBadge, getCompanyBadge, CUSTOMER_BADGES, COMPANY_BADGES } from "@/lib/badges";
import { BadgeIcon } from "@/components/badge-icon";

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


  // Lista de insignias con sus rangos
  const tripsCount = completedTrips || 0;
  const badgesList = (role === "client" || role === "customer")
    ? [
        { ...CUSTOMER_BADGES.BRONZE, range: "1 a 2 viajes", active: tripsCount >= 1 && tripsCount <= 2 },
        { ...CUSTOMER_BADGES.SILVER, range: "3 a 4 viajes", active: tripsCount >= 3 && tripsCount <= 4 },
        { ...CUSTOMER_BADGES.GOLD, range: "5 a 6 viajes", active: tripsCount >= 5 && tripsCount <= 6 },
        { ...CUSTOMER_BADGES.BLACK_DIAMOND, range: "+7 viajes", active: tripsCount >= 7 },
      ]
    : [
        { ...COMPANY_BADGES.BRONZE, range: "1 a 10 viajes", active: tripsCount >= 1 && tripsCount <= 10 },
        { ...COMPANY_BADGES.SILVER, range: "11 a 50 viajes", active: tripsCount >= 11 && tripsCount <= 50 },
        { ...COMPANY_BADGES.GOLD, range: "51 a 200 viajes", active: tripsCount >= 51 && tripsCount <= 200 },
        { ...COMPANY_BADGES.BLACK_DIAMOND, range: "+201 viajes", active: tripsCount >= 201 },
      ];

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

      {/* Insignia / Badge con Dialog de Rangos */}
      {badge && badge.name !== "Sin Rango" && (
        <Dialog>
          <DialogTrigger asChild>
            <button className="relative flex items-center justify-center w-8 h-8 rounded-full border bg-muted/10 hover:bg-muted transition-all duration-300 group shrink-0">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full border text-white overflow-hidden transition-all duration-300 group-hover:scale-110",
                badge.className,
                badge.glowClass
              )}>
                {role === "client" || role === "customer" ? (
                  <BadgeIcon type={badge.key} className="w-full h-full" />
                ) : (
                  <Truck className="h-3 w-3" />
                )}
              </div>
              
              {/* Floating interactive tooltip on hover */}
              <div className="absolute right-0 top-9 w-60 p-3 bg-card border rounded-xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-200 z-50 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center overflow-hidden text-white", badge.className)}>
                    {role === "client" || role === "customer" ? (
                      <BadgeIcon type={badge.key} className="w-full h-full" />
                    ) : (
                      <Truck className="h-2.5 w-2.5" />
                    )}
                  </div>
                  <p className="text-xs font-black text-foreground">{badge.name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {role === "client" || role === "customer" ? "Socio Vorian" : "Flota Certificada"} • {tripsCount} {tripsCount === 1 ? "viaje" : "viajes"}
                </p>
                <p className="text-[9px] text-primary font-bold mt-1.5 pt-1.5 border-t border-border flex items-center gap-1">
                  ✨ Haz click para ver todos los rangos
                </p>
              </div>
            </button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md bg-card border text-card-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Award className="h-5 w-5 text-yellow-500 animate-bounce" />
                Rangos de Fidelidad Vorian
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Completa viajes y aumenta tu volumen operacional en la plataforma para desbloquear insignias exclusivas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Progreso del usuario */}
              <div className="rounded-xl border bg-muted/10 p-3.5 flex justify-between items-center text-xs">
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Tus viajes completados</p>
                  <p className="text-xl font-black text-foreground mt-0.5">{tripsCount} {tripsCount === 1 ? "viaje" : "viajes"}</p>
                </div>
                {badge && badge.name !== "Sin Rango" && (
                  <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider", badge.className)}>
                    {badge.name}
                  </div>
                )}
              </div>

              {/* Lista completa de insignias */}
              <div className="space-y-2">
                {badgesList.map((item) => {
                  const isLocked = tripsCount < item.prevThreshold;
                  return (
                    <div 
                      key={item.name} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                        item.active 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : isLocked 
                            ? "border-muted-foreground/10 opacity-50 bg-muted/5 select-none" 
                            : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full border text-white overflow-hidden shrink-0",
                          item.className,
                          item.glowClass,
                          isLocked && "grayscale"
                        )}>
                          {role === "client" || role === "customer" ? (
                            <BadgeIcon type={item.key} className="w-full h-full" />
                          ) : (
                            <Truck className="h-4 w-4" />
                          )}
                        </div>
                        
                        <div>
                          <p className={cn("text-xs font-bold", isLocked ? "text-muted-foreground" : "text-foreground")}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Requisito: {item.range}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                        {item.active ? (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5 fill-primary/10" />
                            Rango Actual
                          </span>
                        ) : isLocked ? (
                          <span className="flex items-center gap-1 text-muted-foreground/60">
                            <Lock className="h-3 w-3" />
                            Bloqueado
                          </span>
                        ) : (
                          <span className="text-green-600 font-bold flex items-center gap-1">
                            ✓ Completado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
