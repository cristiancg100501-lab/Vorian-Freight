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
import { Bell, Moon, Sun } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import Image from "next/image";
import { doc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

export function Header() {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const { theme, setTheme } = useTheme();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "userProfiles", user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userProfileRef);

  const handleSignOut = () => {
    if (auth) {
      firebaseSignOut(auth);
    }
  };

  const displayName = userProfile ? ((userProfile as any).name || `${(userProfile as any).firstName || ''} ${(userProfile as any).lastName || ''}`.trim()) : "Cargando...";
  const displayRole = userProfile ? (userProfile as any).role.charAt(0).toUpperCase() + (userProfile as any).role.slice(1) : "";

  const isDarkMode = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

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
          <Button variant="ghost" className="relative h-auto w-auto flex items-center gap-3 px-2 rounded-full">
            <Image
              src="https://picsum.photos/seed/1/32/32"
              width={32}
              height={32}
              alt="User avatar"
              className="rounded-full"
              data-ai-hint="user avatar"
            />
            <div className="text-left hidden lg:block">
              <div className="text-sm font-medium text-foreground">{displayName}</div>
              <div className="text-xs text-muted-foreground">{displayRole}</div>
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
