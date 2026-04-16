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


export default function Home() {
  const { user, isUserLoading } = useUser();
  const { supabase } = useSupabase();
  const router = useRouter();

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
    <div className="min-h-screen w-full text-foreground relative overflow-hidden bg-black">
      {/* Background with dynamic map */}
      <div className="absolute inset-0 h-full w-full">
        <LoginMap />
        <div className="absolute inset-0 h-full w-full bg-gradient-to-b from-black/40 via-black/60 to-black" />
      </div>
      
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] relative"
        >
          {/* Subtle glow behind the card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-white/5 to-white/10 blur-2xl rounded-[2rem] opacity-50" />
          
          <div className="relative rounded-[2rem] border border-white/10 bg-black/40 text-white shadow-2xl backdrop-blur-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-10"
              >
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/studio-821157708-eec98.firebasestorage.app/o/assets%2FAdd_a_heading__2___1_-removebg-preview.png?alt=media&token=b87ae379-ebfb-423e-a3a1-b4b2d902444b"
                  width={180}
                  height={45}
                  alt="Vorian Logistics Logo"
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
                <h1 className="text-3xl font-light tracking-tight text-white/90">
                  Bienvenido
                </h1>
                <p className="text-white/40 mt-2 font-light text-sm">
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
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-widest text-white/40 ml-1">
                    Email o RUT
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@empresa.com o 12.345.678-9"
                    required
                    className="h-12 rounded-xl border-white/5 bg-white/[0.03] px-4 text-white placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.05] focus:ring-0 transition-all duration-300"
                  />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-xs font-medium uppercase tracking-widest text-white/40">
                      Contraseña
                    </Label>
                    <Link href="#" className="text-[10px] font-medium uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
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
                      className="h-12 rounded-xl border-white/5 bg-white/[0.03] px-4 pr-12 text-white placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.05] focus:ring-0 transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
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
                      className="text-red-400/80 text-xs font-light px-1"
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
                    className="w-full h-14 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all duration-300 group flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
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
              className="border-t border-white/5 bg-white/[0.02] p-6 text-center"
            >
              <p className="text-xs text-white/30 font-light tracking-wide">
                ¿Aún no eres parte?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-white/60 hover:text-white transition-colors underline underline-offset-4"
                >
                  Crea una cuenta
                </Link>
              </p>
            </motion.div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 blur-3xl rounded-full pointer-events-none" />
        </motion.div>
      </main>
    </div>
  );
}

