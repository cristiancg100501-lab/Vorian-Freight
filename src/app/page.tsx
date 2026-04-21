"use client";

import { useState, useEffect } from "react";
import { useSupabase, useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

import { LoginMap } from "@/components/login-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";


export default function Home() {
  const { user, isUserLoading } = useUser();
  const { supabase } = useSupabase();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const { data: userProfile, isLoading: isProfileLoading } =
    useSupabaseDoc("userProfiles", user?.id);

  useEffect(() => {
    if (!isUserLoading && user && userProfile) {
      router.push(`/${(userProfile as any).role}`);
    }
  }, [user, userProfile, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    let loginEmail = email;

    // If it's not an email, assume it's a RUT and look up the email
    if (!email.includes("@")) {
      try {
        const { data, error: lookupError } = await supabase
          .from("userProfiles")
          .select("email")
          .eq("rut", email)
          .single();

        if (lookupError || !data) {
          setError("RUT no encontrado en el sistema.");
          setIsLoading(false);
          return;
        }
        loginEmail = data.email;
      } catch (err) {
        console.error("RUT lookup error:", err);
        setError("Error al verificar el RUT.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) throw authError;
      
    } catch (error: any) {
      setError("Credenciales inválidas. Por favor, intente de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };


  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isUserLoading || (user && isProfileLoading)) {
        setShowRetry(true);
      }
    }, 8000); // 8 seconds timeout
    return () => clearTimeout(timer);
  }, [isUserLoading, user, isProfileLoading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col justify-center items-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
            <Truck className="h-12 w-12 text-white relative animate-pulse" />
          </div>
          <p className="text-xl font-light tracking-[0.2em] text-white/80 uppercase">Vorian Logistics</p>
        </motion.div>
        
        <AnimatePresence>
          {showRetry && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 flex flex-col items-center gap-6 text-center"
            >
              <p className="text-white/40 text-sm max-w-xs font-light leading-relaxed">
                La conexión está tardando más de lo habitual. Por favor, verifica tu conexión o intenta de nuevo.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="border-white/10 text-white/80 hover:bg-white/5 hover:text-white rounded-full px-8"
                >
                  Reintentar
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-white/40 hover:text-white/80 hover:bg-transparent rounded-full"
                >
                  Cerrar Sesión
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // If user is logged in but has no profile, show a different state or redirect
  if (!isUserLoading && user && !isProfileLoading && !userProfile) {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col justify-center items-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-10 text-center"
        >
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
              <div className="p-6 bg-yellow-500/10 rounded-full border border-yellow-500/20 relative">
                <AlertCircle className="h-12 w-12 text-yellow-500" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-light tracking-tight text-white">Perfil no encontrado</h2>
            <p className="text-white/50 font-light leading-relaxed">
              Tu cuenta se autenticó correctamente, pero no encontramos un perfil asociado en nuestro sistema.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="border-white/10 text-white/80 hover:bg-white/5 hover:text-white rounded-full px-8 h-12"
            >
              Cerrar Sesión
            </Button>
            <Button 
              onClick={() => router.push('/signup')} 
              className="bg-white text-black hover:bg-white/90 rounded-full px-8 h-12 font-medium"
            >
              Ir al Registro
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen w-full text-foreground relative overflow-hidden transition-colors duration-500", resolvedTheme === 'light' ? 'bg-white' : 'bg-black')}>
      {/* Background with dynamic map */}
      <div className="absolute inset-0 h-full w-full">
        <LoginMap theme={resolvedTheme} key={resolvedTheme} />
      </div>
      
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] relative"
        >
          <div className="relative rounded-[2rem] border border-border/10 shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-500 bg-background/70 text-foreground">
            <div className="p-8 md:p-12">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-10"
              >
                <Image
                  src="/logo-white.png"
                  width={180}
                  height={45}
                  alt="Vorian Logistics Logo"
                  className={cn(
                    "transition-all duration-300 drop-shadow-md", 
                    !mounted && "opacity-0",
                    "dark:invert"
                  )}
                  priority
                  unoptimized
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Bienvenido
                </h1>
                <p className="text-muted-foreground mt-2 font-medium text-sm">
                  Inicia sesión para acceder a tu panel de control.
                </p>
              </motion.div>

              <form onSubmit={handleLogin} className="mt-10 space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Email o RUT
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@empresa.com o 12.345.678-9"
                    required
                    className="h-12 rounded-xl border-border bg-background/50 px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-sm transition-all duration-300 shadow-sm"
                  />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Contraseña
                    </Label>
                    <Link href="#" className="flex hover:underline opacity-60 hover:opacity-100 text-[10px] font-bold uppercase tracking-widest text-primary transition-all">
                      ¿Olvidaste?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-12 rounded-xl border-border bg-background/50 px-4 pr-12 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-sm transition-all duration-300 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </motion.div>
                
                <AnimatePresence>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-destructive font-semibold text-xs px-1"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-xl font-bold text-sm bg-foreground hover:bg-foreground/90 text-background shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                    ) : (
                      <>
                        Entrar
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="border-t border-border/50 bg-muted/30 p-6 text-center backdrop-blur-md"
            >
              <p className="text-xs text-muted-foreground font-semibold tracking-wide">
                ¿Aún no eres parte?{" "}
                <Link
                  href="/signup"
                  className="font-bold text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
                >
                  Crea una cuenta
                </Link>
              </p>
            </motion.div>
          </div>
          
        </motion.div>
      </main>
    </div>
  );
}

