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
  Mail
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSupabase } from "./providers/supabase-provider";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useTheme } from "next-themes";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  group: "GENERAL" | "OTROS";
};

const adminNavItems: NavItem[] = [
  { group: "GENERAL", href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { group: "GENERAL", href: "/admin/mission-control", icon: Activity, label: "Mission Control" },
  { group: "GENERAL", href: "/admin/shipments", icon: Package, label: "Envíos (Freight)" },
  { group: "GENERAL", href: "/admin/audit", icon: Waypoints, label: "Auditoría de Envíos" },
  { group: "GENERAL", href: "/admin/users", icon: Users, label: "Usuarios" },
  { group: "OTROS", href: "/admin/rates/tolls", icon: Waypoints, label: "Gestión de Peajes (TAG)" },
  { group: "OTROS", href: "/admin/rates/tolls-map", icon: Map, label: "Mapa de Pórticos" },
  { group: "OTROS", href: "/admin/rates/tolls-import", icon: FileUp, label: "Importador GeoJSON" },
  { group: "OTROS", href: "/admin/rates/tolls-calculator", icon: Waypoints, label: "Simulador de Rutas" },
  { group: "OTROS", href: "/admin/rates", icon: DollarSign, label: "APIs y tarifas" },
  { group: "OTROS", href: "/admin/testing", icon: Mail, label: "Simulador Mails" },
  { group: "OTROS", href: "/admin/reportes", icon: LineChart, label: "Reportes" },
];

const clientNavItems: NavItem[] = [
    { group: "GENERAL", href: "/client/shipments", icon: Package, label: "Mis Envíos" },
    { group: "GENERAL", href: "/client/shipments/new", icon: PlusCircle, label: "Crear Envío" },
    { group: "OTROS", href: "#", icon: Users, label: "Mi Perfil" },
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

const getNavItemsForRole = (role: string): NavItem[] => {
    switch (role) {
        case "admin": return adminNavItems;
        case "client": return clientNavItems;
        case "driver": return driverNavItems;
        case "company": return companyNavItems;
        default: return [];
    }
}

export function Sidebar({ role, isCollapsed, setCollapsed }: { role: string; isCollapsed: boolean; setCollapsed: (isCollapsed: boolean) => void; }) {
  const pathname = usePathname();
  const { supabase } = useSupabase();
  const { resolvedTheme } = useTheme();
  const navItems = getNavItemsForRole(role);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  
  const getBrandLink = (role: string) => {
    switch (role) {
        case "admin": return "/admin";
        case "client": return "/client";
        case "driver": return "/driver";
        case "company": return "/company";
        default: return "/";
    }
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = (pathname.startsWith(item.href) && item.href !== `/${role}` && item.href !== '#') || pathname === item.href;
    
    if (isCollapsed) {
        return (
            <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                    <Link
                        href={item.href}
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground hover:text-background",
                            isActive && "bg-foreground text-background"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
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
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-foreground hover:text-background",
                isActive && "bg-foreground text-background shadow-sm"
            )}
        >
            <item.icon className="h-4 w-4" />
            {item.label}
        </Link>
    );
  }

  return (
    <div className={cn("hidden md:block p-4", isCollapsed && "p-2")}>
      <TooltipProvider>
      <div className={cn("sticky top-4 flex h-full max-h-[calc(100vh-2rem)] flex-col gap-2 rounded-lg border bg-card text-card-foreground shadow-lg", resolvedTheme === 'light' ? 'dark' : 'light-theme-override')}>
        <div className="flex h-14 items-center justify-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href={getBrandLink(role)} className="flex items-start justify-center w-full h-full pt-3">
            {isCollapsed ? (
                <Truck className="h-6 w-6" />
            ) : (
                <Image
                src="/logo-white.png"
                width={140}
                height={40}
                alt="Vorian Logistics Logo"
                className={cn(
                  "transition-all duration-300", 
                  !mounted && "opacity-0",
                  resolvedTheme === 'light' && "invert"
                )}
                priority
                unoptimized
                referrerPolicy="no-referrer"
                />
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className={cn("grid items-start text-base font-medium", isCollapsed ? "justify-center px-2 py-4 gap-2" : "px-4 py-6")}>
            {!isCollapsed && <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">General</p>}
            {navItems.filter(i => i.group === 'GENERAL').map(renderNavItem)}
            {!isCollapsed && <p className="px-3 py-2 mt-4 text-xs font-semibold text-muted-foreground uppercase">Otros</p>}
            {navItems.filter(i => i.group === 'OTROS').map(renderNavItem)}
             <div className="mt-4">
                 {isCollapsed ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button onClick={handleSignOut} variant="ghost" size="icon" className="w-full flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground transition-colors hover:bg-foreground hover:text-background">
                                <LogOut className="h-5 w-5" />
                                <span className="sr-only">Cerrar Sesión</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Cerrar Sesión</TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-foreground hover:text-background text-left w-full"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </button>
                )}
            </div>
          </nav>
        </div>
         <div className="mt-auto border-t p-2">
             <Button variant="ghost" size="icon" className="w-full" onClick={() => setCollapsed(!isCollapsed)}>
                {isCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                <span className="sr-only">{isCollapsed ? 'Expandir' : 'Encoger'}</span>
            </Button>
        </div>
      </div>
      </TooltipProvider>
    </div>
  );
}
