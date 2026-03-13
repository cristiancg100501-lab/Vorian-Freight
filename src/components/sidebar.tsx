"use client";

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
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import Image from "next/image";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  group: "GENERAL" | "OTROS";
};

const adminNavItems: NavItem[] = [
  { group: "GENERAL", href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { group: "GENERAL", href: "/admin/shipments", icon: Package, label: "Envíos (Freight)" },
  { group: "GENERAL", href: "/admin/pedidos", icon: Truck, label: "Pedidos (Express)" },
  { group: "GENERAL", href: "/admin/users", icon: Users, label: "Usuarios" },
  { group: "OTROS", href: "/admin/rates", icon: DollarSign, label: "APIs y tarifas" },
  { group: "OTROS", href: "/admin/reportes", icon: LineChart, label: "Reportes" },
];

const clientNavItems: NavItem[] = [
    { group: "GENERAL", href: "/client", icon: PlusCircle, label: "Crear Envío" },
    { group: "GENERAL", href: "/client/shipments", icon: Package, label: "Mis Envíos" },
    { group: "GENERAL", href: "/client/pedidos", icon: List, label: "Mis Pedidos" },
    { group: "OTROS", href: "#", icon: Users, label: "Mi Perfil" },
];

const driverNavItems: NavItem[] = [
    { group: "GENERAL", href: "/driver", icon: LayoutDashboard, label: "Mi Panel" },
    { group: "GENERAL", href: "/driver/trabajos", icon: List, label: "Mis Trabajos" },
    { group: "OTROS", href: "#", icon: Users, label: "Mi Perfil" },
];

const companyNavItems: NavItem[] = [
    { group: "GENERAL", href: "/company", icon: LayoutDashboard, label: "Dashboard" },
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

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const auth = useAuth();
  const navItems = getNavItemsForRole(role);

  const handleSignOut = () => {
    if (auth) {
      firebaseSignOut(auth);
    }
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

  return (
    <div className="hidden md:block p-4">
      <div className="sticky top-4 flex h-full max-h-[calc(100vh-2rem)] flex-col gap-2 rounded-lg border bg-card text-card-foreground shadow-lg">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href={getBrandLink(role)} className="flex items-center justify-center w-full">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/studio-821157708-eec98.firebasestorage.app/o/assets%2FAdd_a_heading__2___1_-removebg-preview.png?alt=media&token=b87ae379-ebfb-423e-a3a1-b4b2d902444b"
              width={140}
              height={40}
              alt="Vorian Logistics Logo"
              priority
              className="dark:invert-0 invert"
            />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="grid items-start px-2 text-base font-medium lg:px-4">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">General</p>
            {navItems.filter(i => i.group === 'GENERAL').map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                  (pathname.startsWith(item.href) && item.href !== `/${role}`) || pathname === item.href ? "bg-primary text-primary-foreground shadow-md scale-105 transform" : ""
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <p className="px-3 py-2 mt-4 text-xs font-semibold text-muted-foreground uppercase">Otros</p>
            {navItems.filter(i => i.group === 'OTROS').map((item) => (
               <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                  pathname.startsWith(item.href) && item.href !== '#' ? "bg-primary text-primary-foreground shadow-md scale-105 transform" : ""
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
             <button
                onClick={handleSignOut}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
