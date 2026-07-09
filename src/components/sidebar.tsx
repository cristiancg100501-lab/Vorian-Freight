"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Users,
  DollarSign,
  Truck,
  LogOut,
  PlusCircle,
  List,
  Building2,
  LineChart,
  PanelLeftClose,
  PanelRightClose,
  Waypoints,
  Activity,
  Map,
  FileUp,
  Mail,
  Navigation,
  Car,
  CreditCard,
  Zap,
  MessageCircle,
  ShieldCheck
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSupabase } from "./providers/supabase-provider";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useTheme } from "next-themes";
import VorianFreightIcon from "@/assets/vorianfreight.png";

import VorianNewLogo from "@/assets/vorian_new.png";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  group: "GENERAL" | "OTROS";
};

const adminNavItems: NavItem[] = [
  { group: "GENERAL", href: "/admin/freight", icon: LayoutDashboard, label: "Dashboard" },
  { group: "GENERAL", href: "/admin/mission-control", icon: Activity, label: "Mission Control" },
  { group: "GENERAL", href: "/admin/shipments", icon: Package, label: "Envíos (Freight)" },
  { group: "GENERAL", href: "/admin/shipments/managed", icon: PlusCircle, label: "Nuevo Envío Gestionado" },
  { group: "GENERAL", href: "/admin/users", icon: Users, label: "Usuarios" },
  { group: "GENERAL", href: "/admin/verificaciones", icon: ShieldCheck, label: "Verificaciones" },
  { group: "GENERAL", href: "/admin/finances", icon: CreditCard, label: "Finanzas" },
  { group: "GENERAL", href: "/admin/soporte", icon: MessageCircle, label: "Soporte (Chat)" },
  { group: "OTROS", href: "/admin/rates/tolls-map", icon: Map, label: "Mapa de Pórticos" },
  { group: "OTROS", href: "/admin/rates/tolls", icon: Waypoints, label: "Gestión de Peajes (TAG)" },
  { group: "OTROS", href: "/admin/rates/avo", icon: Waypoints, label: "Gestión AVO" },
  { group: "OTROS", href: "/admin/rates", icon: DollarSign, label: "APIs y tarifas" },
  { group: "OTROS", href: "/admin/testing", icon: Mail, label: "Simulador Mails" },
  { group: "OTROS", href: "/admin/reportes", icon: LineChart, label: "Reportes" },
];

const clientNavItems: NavItem[] = [
    { group: "GENERAL", href: "/client/shipments", icon: Package, label: "Mis Envíos" },
    { group: "GENERAL", href: "/client/shipments/new", icon: PlusCircle, label: "Crear Envío" },
    { group: "OTROS", href: "/client/perfil", icon: Building2, label: "Perfil Corporativo" },
];

const driverNavItems: NavItem[] = [
    { group: "GENERAL", href: "/driver", icon: LayoutDashboard, label: "Mi Panel" },
    { group: "GENERAL", href: "/driver/trabajos", icon: List, label: "Mis Trabajos" },
    { group: "OTROS", href: "#", icon: Users, label: "Mi Perfil" },
];

const companyNavItems: NavItem[] = [
    { group: "GENERAL", href: "/company", icon: LayoutDashboard, label: "Dashboard" },
    { group: "GENERAL", href: "/company/shipments", icon: Package, label: "Buscar Cargas" },
    { group: "GENERAL", href: "/company/envios", icon: List, label: "Mis Envíos" },
    { group: "GENERAL", href: "/company/conductores", icon: Users, label: "Mis Conductores" },
    { group: "GENERAL", href: "/company/flota", icon: Truck, label: "Gestión de Flota" },
    { group: "OTROS", href: "/company/perfil", icon: Building2, label: "Perfil de Empresa" },
];

const customerNavItems: NavItem[] = [
    { group: "GENERAL", href: "/customer", icon: LayoutDashboard, label: "Dashboard" },
    { group: "GENERAL", href: "/customer/envios", icon: List, label: "Mis Envíos" },
    { group: "GENERAL", href: "/customer/new", icon: PlusCircle, label: "Crear Envío" },
    { group: "GENERAL", href: "/customer/tracking", icon: Map, label: "Seguimiento Real" },
    { group: "OTROS", href: "#", icon: Users, label: "Mi Perfil" },
];

const getNavItemsForRole = (role: string): NavItem[] => {
    switch (role) {
        case "admin": return adminNavItems;
        case "client": return clientNavItems;
        case "driver": return driverNavItems;
        case "company": return companyNavItems;
        case "customer": return customerNavItems;
        default: return [];
    }
}

export function Sidebar({ role, isCollapsed, setCollapsed }: { role: string; isCollapsed: boolean; setCollapsed: (isCollapsed: boolean) => void; }) {
  const pathname = usePathname();
  const navItems = getNavItemsForRole(role);
  const activeColorClass = "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]";
  const hoverColorClass = "hover:bg-primary/20 hover:text-primary hover:shadow-primary/10";
  const textColorClass = "text-primary";

  const { supabase } = useSupabase();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unreadSupport, setUnreadSupport] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (role === 'company' || role === 'admin') {
      const channel = supabase
        .channel('support-alerts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: 'is_from_support=eq.false',
          },
          (payload) => {
            setUnreadSupport(true);
            // Opcional: Podríamos reproducir un sonido aquí
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, role]);

  // Clear unread badge if we navigate to it
  useEffect(() => {
    if (pathname === '/company/soporte' || pathname === '/admin/soporte') {
      setUnreadSupport(false);
    }
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  
  const getBrandLink = (role: string) => {
    switch (role) {
        case "admin": return "/admin";
        case "client": return "/client";
        case "driver": return "/driver";
        case "company": return "/company";
        case "customer": return "/customer";
        default: return "/";
    }
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href;
    
    if (isCollapsed) {
        return (
            <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                        <Link
                            href={item.href}
                            prefetch={false}
                            className={cn(
                                "group relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300 hover:scale-110 hover:shadow-lg",
                                hoverColorClass,
                                isActive && activeColorClass
                            )}
                        >
                            <item.icon className={cn("h-5 w-5 transition-all duration-300 group-hover:scale-110", isActive && "drop-shadow-md")} />
                            {item.label === "Soporte (Chat)" && unreadSupport && (
                                <span className="absolute right-2 top-2 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                            )}
                            <span className="sr-only">{item.label}</span>
                        </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Link
            key={item.label}
            href={item.href}
            prefetch={false}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground group relative",
                isActive && cn("shadow-[0_0_20px_rgba(0,0,0,0.2)] font-semibold", "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]")
            )}
        >
            <item.icon className={cn("h-4 w-4 transition-all duration-300 group-hover:scale-110", isActive && "drop-shadow-md")} />
            {item.label}
            {item.label === "Soporte (Chat)" && unreadSupport && (
                <span className="ml-auto flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
            )}
        </Link>
    );
  }

  return (
    <div className={cn("hidden md:block p-4 relative z-40", isCollapsed && "p-2")}>
      <TooltipProvider>
      <div 
        className={cn(
          "sticky top-4 flex h-full max-h-[calc(100vh-2rem)] flex-col gap-2 rounded-xl border shadow-2xl overflow-hidden transition-all duration-300",
          "bg-card/98 border-border"
        )}
        style={{ 
          borderColor: 'rgba(255,255,255,0.05)',
        } as any}
      >
        <div className={cn("flex h-14 items-center justify-center border-b border-white/5 px-4 lg:h-[60px] lg:px-6", "bg-white/5")}>
          <Link href={getBrandLink(role)} className="flex items-center justify-center w-full h-full group">
            {isCollapsed ? (
                <>
                  <Image
                    src={VorianNewLogo}
                    alt="Vorian Freight Logo"
                    width={80}
                    height={80}
                    className="h-full w-full object-contain drop-shadow-lg transform scale-[2.5]"
                    priority
                    unoptimized
                  />
                </>
            ) : (
                <Image
                src={VorianNewLogo}
                width={120}
                height={50}
                alt="Vorian Logistics Logo"
                className={cn(
                  "transition-all duration-300 object-contain", 
                  !mounted && "opacity-0"
                )}
                priority
                unoptimized
                />
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className={cn("grid items-start text-sm font-medium gap-1", isCollapsed ? "justify-center" : "")}>
            {!isCollapsed && <p className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">General</p>}
            {navItems.filter(i => i.group === 'GENERAL').map(renderNavItem)}
            {!isCollapsed && <p className="px-3 py-2 mt-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Otros</p>}
            {navItems.filter(i => i.group === 'OTROS').map(renderNavItem)}
             <div className="mt-4 pt-4 border-t border-white/5">
                 {isCollapsed ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button onClick={handleSignOut} variant="ghost" size="icon" className="w-full flex items-center justify-center h-10 w-10 rounded-xl text-white/50 transition-all duration-300 hover:bg-red-500/20 hover:text-red-400 hover:scale-110 hover:shadow-lg group">
                                <LogOut className="h-5 w-5 transition-all duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                                <span className="sr-only">Cerrar Sesión</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Cerrar Sesión</TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-white/60 transition-all hover:bg-red-500/10 hover:text-red-400 text-left w-full group"
                    >
                        <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Cerrar Sesión
                    </button>
                )}
            </div>
          </nav>
        </div>
      </div>
      </TooltipProvider>
    </div>
  );
}
