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
  ShieldCheck,
  Inbox
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSupabase } from "./providers/supabase-provider";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useTheme } from "next-themes";
import VorianWhiteLogo from "@/assets/vorianwhite.png";

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
  { group: "GENERAL", href: "/admin/contactos", icon: Inbox, label: "Contacto Ventas" },
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
  const activeColorClass = "bg-white/10 dark:bg-black/5 text-white dark:text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] dark:shadow-[0_0_15px_rgba(0,0,0,0.1)]";
  const hoverColorClass = "hover:bg-white/10 dark:hover:bg-black/5 hover:text-white dark:hover:text-black";
  const textColorClass = "text-white/70 dark:text-black/70";

  const { supabase } = useSupabase();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unreadSupport, setUnreadSupport] = useState(false);
  const [unreadContacts, setUnreadContacts] = useState(false);

  useEffect(() => {
    if (role !== 'admin') return;

    const checkUnreadContacts = async () => {
      try {
        const { data, error } = await supabase
          .from('contact_requests')
          .select('id')
          .eq('status', 'Nuevo')
          .limit(1);
        if (!error && data && data.length > 0) {
          setUnreadContacts(true);
        }
      } catch (err) {
        console.error('Error checking unread contacts:', err);
      }
    };
    checkUnreadContacts();

    const channel = supabase
      .channel('contact-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_requests',
        },
        () => {
          setUnreadContacts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, role]);

  // Clear unread badge if we navigate to it
  useEffect(() => {
    if (pathname === '/admin/contactos') {
      setUnreadContacts(false);
    }
  }, [pathname]);

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
                                "group relative flex h-10 w-10 items-center justify-center rounded-xl text-white/70 dark:text-black/70 transition-all duration-300 hover:scale-110 hover:shadow-lg",
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
                            {item.label === "Contacto Ventas" && unreadContacts && (
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-white/70 dark:text-black/70 transition-all hover:bg-white/10 dark:hover:bg-black/5 hover:text-white dark:hover:text-black group relative",
                isActive && cn("shadow-md font-semibold", "bg-white/10 dark:bg-black/5 text-white dark:text-black")
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
            {item.label === "Contacto Ventas" && unreadContacts && (
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
          "bg-[#121212] dark:bg-white border-white/10 dark:border-black/10 text-white dark:text-black"
        )}
        style={{ 
          borderColor: resolvedTheme === 'dark' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
        } as any}
      >
        <div className={cn("flex h-14 items-center justify-center border-b border-white/10 dark:border-black/5 px-4 lg:h-[60px] lg:px-6", "bg-white/5 dark:bg-black/5")}>
          <Link href={getBrandLink(role)} className="flex items-center justify-center w-full h-full group">
            {isCollapsed ? (
                <>
                  <Image
                    src={VorianWhiteLogo}
                    alt="Vorian Global Logo"
                    width={100}
                    height={100}
                    className="h-full w-full object-contain transform scale-[4.0] dark:invert"
                    priority
                    unoptimized
                  />
                </>
            ) : (
                <>
                  <Image
                  src={VorianWhiteLogo}
                  width={200}
                  height={80}
                  alt="Vorian Logistics Logo"
                  className={cn(
                    "transition-all duration-300 object-contain transform scale-[2.0] dark:invert", 
                    !mounted && "opacity-0"
                  )}
                  priority
                  unoptimized
                  />
                </>
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
          <nav className={cn("grid items-start text-sm font-medium gap-1", isCollapsed ? "justify-center" : "")}>
            {!isCollapsed && <p className="px-3 py-2 text-[10px] font-bold text-white/30 dark:text-black/30 uppercase tracking-[0.2em]">General</p>}
            {navItems.filter(i => i.group === 'GENERAL').map(renderNavItem)}
            {!isCollapsed && <p className="px-3 py-2 mt-4 text-[10px] font-bold text-white/30 dark:text-black/30 uppercase tracking-[0.2em]">Otros</p>}
            {navItems.filter(i => i.group === 'OTROS').map(renderNavItem)}
             <div className="mt-4 pt-4 border-t border-white/10 dark:border-black/5">
                 {isCollapsed ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button onClick={handleSignOut} variant="ghost" size="icon" className="w-full flex items-center justify-center h-10 w-10 rounded-xl text-white/50 dark:text-black/50 transition-all duration-300 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:scale-110 hover:shadow-lg group">
                                <LogOut className="h-5 w-5 transition-all duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                                <span className="sr-only">Cerrar Sesión</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Cerrar Sesión</TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-white/60 dark:text-black/60 transition-all hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-left w-full group"
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
