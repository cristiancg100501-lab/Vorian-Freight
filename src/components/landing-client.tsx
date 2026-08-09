"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Truck, ShieldCheck, Clock, Menu, X, Map, Sun, Moon, Laptop, CheckCircle2, Ship, Anchor, Plane, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import VorianLogo from "@/assets/vorian_logo.png";
import { FAQ } from "@/components/faq";
import { GalacticCTA } from "@/components/galactic-cta";
import { Footer } from "@/components/footer";
import { CompanySection } from "@/components/company-section";
import { useTheme } from "next-themes";
import dynamic from 'next/dynamic';
import { QuoteCalculator } from "./landing/quote-calculator";
import { IndustriesSection } from "./landing/industries-section";
import { InteractiveContainer3D } from "./landing/interactive-container";

function AnimatedSpeed() {
  const [speed, setSpeed] = useState(64);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate randomly between 62 and 68
      setSpeed(Math.floor(Math.random() * (68 - 62 + 1)) + 62);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return <>{speed}</>;
}

const LandingMap = dynamic(() => import('@/components/landing-map').then(mod => mod.LandingMap), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-card animate-pulse"></div>
});

export function LandingClient() {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <nav 
        className={`fixed w-full z-50 transition-all duration-500 ease-in-out ${
          isScrolled 
            ? "-translate-y-full opacity-0 pointer-events-none" 
            : "translate-y-0 opacity-100 py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 z-50">
            <Image 
              src={VorianLogo} 
              alt="Vorian Global" 
              width={150} 
              height={42} 
              className="object-contain dark:invert-0 invert"
              priority={true}
            />
          </Link>

          {/* Desktop Menu - Fintech/Startup Capsule Style */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            <div className={`flex items-center gap-1 rounded-full px-1.5 py-1.5 transition-all duration-500 ${
              isScrolled 
                ? "bg-card/90 backdrop-blur-xl border border-border shadow-sm" 
                : "bg-card/40 backdrop-blur-md border border-border/50"
            }`}>
              <a href="#soluciones" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent px-5 py-2 rounded-full transition-all cursor-pointer">
                Soluciones
              </a>
              <a href="#plataforma" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent px-5 py-2 rounded-full transition-all cursor-pointer">
                Plataforma
              </a>
              <a href="#compania" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent px-5 py-2 rounded-full transition-all cursor-pointer">
                Compañía
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4 z-50">
            <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-2">
              Iniciar sesión
            </Link>
             <Link href="/contacto">
               <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-5 font-bold shadow-md transition-all hover:scale-105 active:scale-95 group flex items-center gap-2">
                 Hablar con ventas
                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </Button>
             </Link>
             
             {/* Theme Switcher Desktop Capsule */}
             {!mounted ? (
               <div className="w-[100px] h-9 bg-card/40 border border-border/50 rounded-full animate-pulse" />
             ) : (
               <div className={`flex items-center border p-0.5 gap-0.5 rounded-full transition-all ${
                 isScrolled ? "bg-card/90 border-border/80" : "bg-card/40 border-border/50"
               }`}>
                 <button 
                   onClick={() => setTheme("light")} 
                   className={`p-1.5 rounded-full transition-all ${
                     theme === "light" 
                       ? "bg-foreground text-background shadow-md scale-105" 
                       : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                   }`}
                   title="Modo Claro"
                 >
                   <Sun className="w-3.5 h-3.5" />
                 </button>
                 <button 
                   onClick={() => setTheme("dark")} 
                   className={`p-1.5 rounded-full transition-all ${
                     theme === "dark" 
                       ? "bg-foreground text-background shadow-md scale-105" 
                       : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                   }`}
                   title="Modo Oscuro"
                 >
                   <Moon className="w-3.5 h-3.5" />
                 </button>
                 <button 
                   onClick={() => setTheme("system")} 
                   className={`p-1.5 rounded-full transition-all ${
                     theme === "system" 
                       ? "bg-foreground text-background shadow-md scale-105" 
                       : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                   }`}
                   title="Sistema"
                 >
                   <Laptop className="w-3.5 h-3.5" />
                 </button>
               </div>
             )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden z-50 text-foreground p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 w-full bg-card/95 backdrop-blur-xl border-b border-border py-6 px-6 flex flex-col gap-6 md:hidden"
            >
              <div className="flex flex-col gap-4">
                <a href="#soluciones" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground cursor-pointer">
                  Soluciones
                </a>
                <a href="#plataforma" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground cursor-pointer">
                  Plataforma
                </a>
                <a href="#compania" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground cursor-pointer">
                  Compañía
                </a>
              </div>
              <div className="h-px w-full bg-border"></div>
              <div className="flex flex-col gap-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground">
                  Iniciar sesión
                </Link>
                 <Link href="/contacto" onClick={() => setMobileMenuOpen(false)}>
                   <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-lg font-semibold">
                     Hablar con ventas
                   </Button>
                 </Link>
              </div>
              
              {/* Mobile Menu Theme Row */}
              {mounted && (
                <div className="flex flex-col gap-2 pt-2 border-t border-border/80">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tema del sitio</p>
                  <div className="flex items-center bg-accent/40 border border-border/40 rounded-full p-0.5 gap-0.5 w-full">
                    <button 
                      onClick={() => setTheme("light")} 
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        theme === "light" 
                          ? "bg-foreground text-background shadow-md" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      Claro
                    </button>
                    <button 
                      onClick={() => setTheme("dark")} 
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        theme === "dark" 
                          ? "bg-foreground text-background shadow-md" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      Oscuro
                    </button>
                    <button 
                      onClick={() => setTheme("system")} 
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        theme === "system" 
                          ? "bg-foreground text-background shadow-md" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Laptop className="w-4 h-4" />
                      Sistema
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="relative">
        {/* Static Background Glows (Optimized for performance) */}
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-foreground/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-foreground/5 rounded-full blur-[100px] pointer-events-none"></div>


        {/* Hero Section */}
        <section className="container mx-auto px-4 md:px-6 pt-32 pb-24 md:pt-48 md:pb-12 flex flex-col items-center text-center relative z-10">
          
          {/* Animated Hero Content Wrapper (Static on scroll) */}
          <motion.div className="w-full flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground text-sm font-medium mb-8 border border-border/50"
          >
            <span className="flex h-2 w-2 rounded-full bg-foreground shadow-sm"></span>
            Conectamos Puertos y Aeropuertos con toda tu cadena de suministro
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mb-6 leading-tight"
          >
            Tu socio logístico con <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-700 to-zinc-950 dark:from-zinc-300 dark:to-zinc-100">trazabilidad</span> en tiempo real
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-foreground/80 max-w-2xl mb-12 leading-relaxed font-medium"
          >
            Gestionamos tu logística terrestre de importación y exportación de forma personalizada. 
            Transportamos contenedores (FCL), carga suelta (LCL) y carga aérea desde los principales puertos y aeropuertos hacia todo Chile.
          </motion.p>

          <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col gap-4 w-full max-w-md lg:max-w-none lg:w-1/2 items-center lg:items-start text-center lg:text-left"
            >
              <h3 className="text-2xl font-bold text-foreground">¿Listo para optimizar tu logística?</h3>
              <p className="text-muted-foreground">Obtén tarifas competitivas al instante y comienza a mover tu carga con total visibilidad hoy mismo.</p>
              <div className="flex flex-col sm:flex-row gap-4 w-full mt-4">
                <Link href="/contacto" className="w-full sm:w-auto">
                  <Button className="w-full h-14 px-8 rounded-full text-base font-semibold bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-all shadow-xl dark:shadow-white/5">
                    Cotizar con ejecutivo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#como-funciona" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full h-14 px-8 rounded-full text-base font-semibold border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                    Conoce más
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-6 text-sm text-foreground/70 font-bold">
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-foreground/90" /> Tarifas garantizadas</div>
                <div className="hidden sm:block text-border">•</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-foreground/90" /> Sin costos ocultos</div>
                <div className="hidden sm:block text-border">•</div>
                <div className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-foreground/90" /> Red certificada</div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="w-full lg:w-1/2"
            >
              <QuoteCalculator />
            </motion.div>
            </div>
          </motion.div>

          {/* Realistic Dashboard Mockup (Stays visible) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="w-full max-w-5xl mt-24 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-20 pointer-events-none"></div>
            
            <div className="relative bg-background rounded-[2rem] overflow-hidden border border-border shadow-2xl shadow-black/50 flex flex-col md:flex-row text-left w-full aspect-[16/9] md:aspect-[21/9]">
              
              {/* Sidebar (Mock) */}
              <div className="hidden md:flex w-56 lg:w-64 bg-muted border-r border-border flex-col p-4">
                <div className="flex items-center gap-3 mb-8 px-2">
                  <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
                    <Truck className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="font-semibold text-foreground text-sm">Vorian Dashboard</div>
                </div>
                
                <div className="space-y-1">
                  {["Visión General", "Rutas Activas", "Flota", "Conductores", "Reportes"].map((item, idx) => (
                    <div key={idx} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-3 ${idx === 1 ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors'}`}>
                      {idx === 1 && <Map className="w-4 h-4" />}
                      {idx !== 1 && <div className="w-4 h-4 rounded-full border border-border/50"></div>}
                      {item}
                    </div>
                  ))}
                </div>
                
                <div className="mt-auto pt-4 border-t border-border">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-accent"></div>
                    <div className="text-xs">
                      <div className="text-foreground font-medium">Administrador</div>
                      <div className="text-muted-foreground truncate w-32">admin@empresa.com</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area (Mock) */}
              <div className="flex-1 bg-background flex flex-col">
                {/* Topbar */}
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                    Rutas Activas <span className="text-border">/</span> <span className="text-foreground">Ruta #VF-8492</span>
                  </div>
                  <div className="flex items-center gap-3 hidden sm:flex">
                    <div className="w-32 lg:w-48 h-8 bg-background border border-border rounded-md"></div>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Body */}
                <div className="p-4 lg:p-6 flex-1 flex flex-col gap-4 lg:gap-6 overflow-hidden">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: "Panel de Ingresos", value: "$0", trend: "Demo" },
                      { label: "Envíos en curso", value: "0", trend: "Iniciando" },
                      { label: "Estado del Sistema", value: "Óptimo", trend: "100%", hidden: true },
                    ].map((stat, idx) => (
                      <div key={idx} className={`bg-card border border-border rounded-xl p-4 flex flex-col gap-2 ${stat.hidden ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                        <div className="flex items-end justify-between">
                          <div className="text-xl lg:text-2xl font-bold text-foreground">{stat.value}</div>
                          <div className="text-xs font-medium text-green-500">{stat.trend}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Map / Tracking View */}
                  <div className="flex-1 bg-card border border-border rounded-[1.5rem] relative overflow-hidden flex min-h-[200px]">
                    <div className="absolute inset-0 pointer-events-none">
                      <LandingMap theme={resolvedTheme} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>


        {/* Coverage Band (Honest Social Proof) */}
        <section className="w-full py-10 border-y border-border bg-muted/10 overflow-hidden relative">
          <div className="container mx-auto px-4 md:px-6">
            <p className="text-center text-sm font-medium text-muted-foreground mb-6">Cobertura operativa en los principales nodos logísticos</p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 transition-all duration-500">
              <div className="flex items-center gap-2 font-bold text-lg"><Anchor className="w-5 h-5 text-foreground" /> Puerto San Antonio</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Anchor className="w-5 h-5 text-foreground" /> Puerto Valparaíso</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Plane className="w-5 h-5 text-foreground" /> Aeropuerto AMB</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Map className="w-5 h-5 text-foreground" /> Región Metropolitana</div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="soluciones" className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
                Todo lo que necesitas para mover tu carga
              </h2>
              <p className="text-lg text-muted-foreground">
                Herramientas diseñadas para simplificar la logística, reducir costos y mantener tu negocio en movimiento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">
              {/* Box 1: Large (2 cols, 1 row) - Tracking */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
                className="md:col-span-2 bg-card rounded-[2rem] p-8 md:p-10 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 overflow-hidden relative group shadow-lg flex flex-col md:flex-row gap-8 items-center"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-zinc-500/20 transition-colors duration-500"></div>
                <div className="relative z-10 w-full md:w-1/2 flex flex-col justify-center">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-accent border border-border flex items-center justify-center text-foreground mb-6 backdrop-blur-sm shadow-sm">
                      <Map className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Rastreo de Contenedores y Carga</h3>
                    <p className="text-muted-foreground text-lg mb-6">Mantén el control total de tus importaciones/exportaciones con actualizaciones precisas de ubicación y estado 24/7 desde el momento en que tu carga pisa tierra.</p>
                  </div>
                </div>
                
                {/* Decorative element: Improved Mini Map UI */}
                <div className="relative z-10 w-full md:w-1/2 h-64 md:h-72 bg-muted/20 rounded-2xl border border-border overflow-hidden shadow-2xl group-hover:-translate-y-2 group-hover:shadow-3xl transition-all duration-500">
                   {/* Fake Map Grid & Routes */}
                   <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--foreground) / 0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                   <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
                   
                   {/* Animated Route Line Background */}
                   <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                     <path d="M -20 180 Q 120 160 160 80 T 320 40" fill="transparent" stroke="hsl(var(--muted-foreground))" strokeWidth="6" className="opacity-20" strokeLinecap="round" />
                   </svg>
                   
                   {/* Animated Route Line Active */}
                   <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                     <motion.path 
                       d="M -20 180 Q 120 160 160 80 T 320 40" 
                       fill="transparent" 
                       stroke="hsl(var(--primary))" 
                       strokeWidth="4" 
                       strokeDasharray="10 10"
                       animate={{ strokeDashoffset: [0, -100] }}
                       transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                       strokeLinecap="round" 
                     />
                   </svg>
                   
                   {/* Start Point */}
                   <div className="absolute left-[30px] top-[170px] w-5 h-5 bg-background border-4 border-primary rounded-full shadow-lg z-10"></div>
                   
                   {/* Moving Truck / Current Location */}
                   <motion.div 
                     className="absolute z-20 flex items-center justify-center -ml-4 -mt-4"
                     animate={{ 
                       x: [30, 90, 160, 240, 320], 
                       y: [170, 155, 80, 60, 40]
                     }}
                     transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                   >
                      <div className="w-16 h-16 bg-primary/20 rounded-full absolute animate-ping opacity-50"></div>
                      <div className="w-8 h-8 bg-primary rounded-full shadow-xl relative z-10 flex items-center justify-center border-2 border-background">
                        <Truck className="w-4 h-4 text-primary-foreground" />
                      </div>
                   </motion.div>
                   
                   {/* Destination Point */}
                   <div className="absolute left-[310px] top-[30px] w-6 h-6 bg-muted border-4 border-card rounded-full shadow-md z-10 flex items-center justify-center">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                   </div>
                   
                   {/* Floating ETA Card */}
                   <motion.div 
                      className="absolute bottom-4 left-4 right-4 md:left-8 md:right-8 bg-card/95 backdrop-blur-md border border-border rounded-xl p-4 shadow-xl z-30 flex items-center justify-between"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                   >
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground">Volvo FH16</div>
                          <div className="text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse"></div> En ruta
                          </div>
                          <div className="text-sm text-foreground font-bold truncate">CX-9020</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Llegada est.</div>
                        <div className="text-sm text-foreground font-black">16:45 hrs</div>
                      </div>
                   </motion.div>
                </div>
              </motion.div>
              
              {/* Box 2: Small (1 col, 1 row) - Fleet Management */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="md:col-span-1 bg-gradient-to-br from-card to-muted/30 rounded-[2rem] p-8 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 overflow-hidden relative group shadow-lg flex flex-col"
              >
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-zinc-500/5 blur-[80px] group-hover:bg-zinc-500/10 transition-colors duration-500"></div>
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-accent border border-border flex items-center justify-center text-foreground mb-4 backdrop-blur-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Especialistas en Puertos</h3>
                  <p className="text-muted-foreground text-sm mb-6">Transportistas certificados y procesos optimizados para el retiro de carga desde San Antonio, Valparaíso y SCL.</p>
                  
                  {/* Decorative element: Stats Bars */}
                  <div className="mt-auto flex flex-col gap-4 bg-background/50 rounded-xl p-4 border border-border">
                    {[
                      { label: "Tiempo de Asignación", width: "w-[15%]", color: "bg-foreground" },
                      { label: "Costos Operativos", width: "w-[40%]", color: "bg-foreground/60" },
                      { label: "Satisfacción", width: "w-[95%]", color: "bg-foreground/80" },
                    ].map((stat, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className={`h-full ${stat.color} rounded-full`}
                            initial={{ width: 0 }}
                            whileInView={{ width: stat.width.replace('w-[', '').replace(']', '') }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.5 + (i * 0.2) }}
                          ></motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Box 3: Medium (2 cols, 1 row) - Audit (formerly Box 4) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:col-span-2 bg-card rounded-[2rem] p-8 md:p-10 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 relative group shadow-lg overflow-hidden flex flex-col md:flex-row items-center gap-8"
              >
                <div className="relative z-10 w-full md:w-1/2 flex flex-col justify-center">
                  <div className="w-12 h-12 rounded-xl bg-accent border border-border flex items-center justify-center text-foreground mb-4">
                     <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Auditoría Inmutable de Rutas</h3>
                  <p className="text-muted-foreground text-sm mb-6">Historial exacto con telemetría GPS para máxima transparencia ante tus clientes.</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs text-foreground font-medium"><div className="w-4 h-4 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-[10px]">✓</div> Datos sellados criptográficamente</li>
                    <li className="flex items-center gap-3 text-xs text-foreground font-medium"><div className="w-4 h-4 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-[10px]">✓</div> Prevención de desvíos</li>
                  </ul>
                </div>
                
                {/* Decorative Real UI element - Minimalist Telemetry Dashboard */}
                <div className="relative z-10 w-full md:w-1/2 h-64 md:h-72 bg-muted/20 rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col group-hover:-translate-y-2 group-hover:shadow-3xl transition-all duration-500">
                   
                   {/* Fake Map Grid */}
                   <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--foreground) / 0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                   <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
                   
                   <div className="flex-1 relative overflow-hidden">
                      {/* Top Right Replay Badge */}
                      <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-md border border-border px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm z-20">
                         <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                         <span className="text-[10px] text-foreground font-bold tracking-widest">REPLAY</span>
                         <span className="text-[10px] font-mono text-muted-foreground ml-2 border-l border-border pl-2">VF-9022A</span>
                      </div>

                      {/* Animated Route Line Background */}
                      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                         <path d="M 0 200 Q 150 150 200 100 T 400 40" fill="transparent" stroke="hsl(var(--muted-foreground))" strokeWidth="6" className="opacity-20" strokeLinecap="round" />
                      </svg>
                      
                      {/* Animated Route Line Active */}
                      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                         <motion.path 
                           d="M 0 200 Q 150 150 200 100 T 400 40" 
                           fill="transparent" 
                           stroke="hsl(var(--foreground))" 
                           strokeWidth="4"
                           strokeLinecap="round"
                           initial={{ pathLength: 0 }}
                           animate={{ pathLength: 1 }}
                           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                         />
                      </svg>
                      
                      {/* Moving Truck marker */}
                      <motion.div 
                        className="absolute w-8 h-8 rounded-full flex items-center justify-center z-10 -ml-4 -mt-4 shadow-xl"
                        animate={{ 
                           x: [0, 150, 200, 300, 400], 
                           y: [200, 150, 100, 80, 40]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      >
                         <div className="w-8 h-8 bg-foreground rounded-full shadow-xl relative z-10 flex items-center justify-center border-2 border-background">
                           <Truck className="w-4 h-4 text-background" />
                         </div>
                      </motion.div>
                      
                      {/* Floating Telemetry Glass Panel */}
                      <motion.div 
                        className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-md border border-border p-4 rounded-xl flex items-center gap-6 shadow-xl"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <div className="flex flex-col">
                           <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase mb-1">Velocidad</span>
                           <div className="flex items-baseline gap-1">
                              <motion.span 
                                className="text-2xl font-black text-foreground leading-none tabular-nums"
                              >
                                <AnimatedSpeed />
                              </motion.span>
                              <span className="text-xs text-muted-foreground font-medium">km/h</span>
                           </div>
                           <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
                              <motion.div className="bg-foreground h-1 rounded-full" animate={{ width: ["60%", "65%", "62%", "68%", "60%"] }} transition={{ duration: 4, repeat: Infinity }} />
                           </div>
                        </div>
                        
                        <div className="h-10 w-[1px] bg-border mx-2"></div>

                        <div className="flex flex-col">
                           <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase mb-1">Seguridad</span>
                           <div className="flex items-center gap-2 text-foreground font-medium text-xs">
                             <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                             ALERTA
                           </div>
                           <div className="text-[9px] font-mono text-muted-foreground mt-2">COORD: -33.45, -70.66</div>
                        </div>
                      </motion.div>
                      
                   </div>
                </div>
              </motion.div>

              {/* Box 4: Small (1 col, 1 row) - Security (formerly Box 3) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="md:col-span-1 bg-background rounded-[2rem] p-8 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 relative group shadow-lg overflow-hidden flex flex-col items-center text-center gap-6 justify-center"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-800/40 via-transparent to-transparent opacity-50"></div>
                <div className="relative z-10 w-full">
                  <h3 className="text-xl font-bold text-foreground mb-2">Entregas con PIN</h3>
                  <p className="text-muted-foreground text-sm">Validación estricta para recepción y entrega.</p>
                </div>
                
                {/* Decorative Real UI element - PIN Animation */}
                <div className="relative z-10 w-full bg-card rounded-2xl border border-border p-4 shadow-2xl flex flex-col items-center gap-4">
                   <div className="flex gap-2 w-full justify-center">
                     <div className="w-9 h-10 rounded-xl border-2 border-border bg-background flex items-center justify-center font-mono text-lg font-bold text-foreground shadow-inner">
                       <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.1 }}>4</motion.span>
                     </div>
                     <div className="w-9 h-10 rounded-xl border-2 border-border bg-background flex items-center justify-center font-mono text-lg font-bold text-foreground shadow-inner">
                       <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.1, delay: 1 }}>8</motion.span>
                     </div>
                     <div className="w-9 h-10 rounded-xl border-2 border-border bg-background flex items-center justify-center font-mono text-lg font-bold text-foreground shadow-inner">
                       <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.1, delay: 2 }}>2</motion.span>
                     </div>
                     <div className="w-9 h-10 rounded-xl border-2 border-foreground bg-background flex items-center justify-center font-mono text-lg font-bold text-foreground shadow-inner">
                       <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.1, delay: 3, times: [0, 0.5, 1] }}>
                         <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2.5 h-2.5 bg-foreground rounded-full" />
                       </motion.span>
                       <motion.span animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, times: [0, 0.75, 0.8, 1], repeat: Infinity, repeatDelay: 1 }} className="absolute">7</motion.span>
                     </div>
                   </div>
                   
                   <div className="relative w-full h-9 rounded-xl overflow-hidden mt-1">
                     {/* Default Button State */}
                     <motion.div 
                        className="absolute inset-0 bg-muted text-foreground border border-border flex items-center justify-center text-[10px] font-bold uppercase tracking-wider"
                        animate={{ opacity: [1, 1, 0, 0, 1] }}
                        transition={{ duration: 4, times: [0, 0.75, 0.76, 0.99, 1], repeat: Infinity, repeatDelay: 1 }}
                     >
                        Esperando PIN...
                     </motion.div>
                     {/* Success State */}
                     <motion.div 
                        className="absolute inset-0 bg-foreground text-background flex items-center justify-center text-[10px] font-bold uppercase tracking-wider gap-1.5 shadow-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: [0, 0, 1, 1, 0], y: [20, 20, 0, 0, -20] }}
                        transition={{ duration: 4, times: [0, 0.75, 0.8, 0.95, 1], repeat: Infinity, repeatDelay: 1 }}
                     >
                        <ShieldCheck className="w-3.5 h-3.5" /> Entregado
                     </motion.div>
                   </div>
                </div>
              </motion.div>
              {/* Box 5: Full Width (3 cols) - Proactive Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="md:col-span-3 bg-card rounded-[2rem] p-8 md:p-12 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 relative group shadow-lg overflow-hidden flex flex-col md:flex-row items-center gap-12"
              >
                <div className="relative z-10 w-full md:w-1/2 flex flex-col justify-center">
                  <div className="w-12 h-12 rounded-xl bg-accent border border-border flex items-center justify-center text-foreground mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell-ring w-6 h-6"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Alertas Proactivas en Vivo</h3>
                  <p className="text-muted-foreground text-lg mb-6">El sistema informa automáticamente a tus clientes de cada hito importante del viaje, sin que tengas que levantar el teléfono o enviar correos manuales.</p>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-sm text-foreground font-medium"><div className="w-5 h-5 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-xs">✓</div> Alertas de ingreso a puerto y salida</li>
                    <li className="flex items-center gap-3 text-sm text-foreground font-medium"><div className="w-5 h-5 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-xs">✓</div> Avisos instantáneos de demoras</li>
                    <li className="flex items-center gap-3 text-sm text-foreground font-medium"><div className="w-5 h-5 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-xs">✓</div> Notificaciones de confirmación de entrega</li>
                  </ul>
                </div>
                
                {/* Decorative Real UI element - Smartphone Notifications */}
                <div className="relative z-10 w-full md:w-1/2 h-72 bg-muted rounded-3xl border border-border/50 overflow-hidden shadow-inner flex flex-col items-center justify-center p-6">
                   
                   {/* Smartphone Frame */}
                   <div className="relative w-64 h-[340px] bg-background border-[6px] border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden translate-y-12 group-hover:translate-y-8 transition-transform duration-700">
                      {/* Notch */}
                      <div className="absolute top-0 inset-x-0 h-5 bg-zinc-200 dark:border-zinc-800 rounded-b-xl w-32 mx-auto z-20"></div>
                      
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                      
                      <div className="relative z-10 p-4 pt-10 flex flex-col gap-3">
                         
                         {/* Notification 1 */}
                         <motion.div 
                           className="bg-card/90 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-border/50"
                           initial={{ opacity: 0, y: -20, scale: 0.9 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           transition={{ duration: 0.5, delay: 1 }}
                         >
                            <div className="flex gap-3 items-start">
                               <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Truck className="w-4 h-4 text-foreground" />
                               </div>
                               <div>
                                  <div className="flex justify-between items-center w-full mb-0.5">
                                     <span className="text-xs font-bold text-foreground">Vorian Tracker</span>
                                     <span className="text-[10px] text-muted-foreground">Ahora</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-tight">El camión CX-9020 ha ingresado exitosamente al <b>Puerto de San Antonio</b>.</p>
                               </div>
                            </div>
                         </motion.div>
                         
                         {/* Notification 2 */}
                         <motion.div 
                           className="bg-card/90 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-border/50"
                           initial={{ opacity: 0, y: -20, scale: 0.9 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           transition={{ duration: 0.5, delay: 3 }}
                         >
                            <div className="flex gap-3 items-start">
                               <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center shadow-sm">
                                  <ShieldCheck className="w-4 h-4 text-foreground" />
                               </div>
                               <div>
                                  <div className="flex justify-between items-center w-full mb-0.5">
                                     <span className="text-xs font-bold text-foreground">Alerta de Sistema</span>
                                     <span className="text-[10px] text-muted-foreground">2 min</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-tight">Se detecta una espera prolongada en zona de carga. ETA actualizado a <b>17:30 hrs</b>.</p>
                               </div>
                            </div>
                         </motion.div>
                         
                         {/* Notification 3 */}
                         <motion.div 
                           className="bg-card/90 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-border/50"
                           initial={{ opacity: 0, y: -20, scale: 0.9 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           transition={{ duration: 0.5, delay: 5.5 }}
                         >
                            <div className="flex gap-3 items-start">
                               <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <CheckCircle2 className="w-4 h-4 text-foreground" />
                               </div>
                               <div>
                                  <div className="flex justify-between items-center w-full mb-0.5">
                                     <span className="text-xs font-bold text-foreground">Entrega Confirmada</span>
                                     <span className="text-[10px] text-muted-foreground">15 min</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-tight">Carga descargada y validad con PIN correctamente.</p>
                               </div>
                            </div>
                         </motion.div>

                      </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it Works / Split Section */}
        <section id="plataforma" className="py-20 md:py-32 bg-background overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2"
              >
                <div className="aspect-square max-w-md mx-auto lg:mx-0 relative">
                  <div className="absolute inset-0 bg-green-500/10 rounded-full blur-[80px] opacity-50 transform translate-x-10 translate-y-10 pointer-events-none"></div>
                  
                  <div className="relative h-full bg-card rounded-[2rem] border border-border shadow-2xl p-6 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="text-foreground font-bold mb-6 flex items-center justify-between z-10">
                      Asignando Operación...
                      <div className="flex gap-1">
                        <motion.div animate={{ height: [4, 14, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 bg-green-500 rounded-full"></motion.div>
                        <motion.div animate={{ height: [4, 20, 4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 bg-green-500 rounded-full"></motion.div>
                        <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 bg-green-500 rounded-full"></motion.div>
                      </div>
                    </div>
                    
                    {/* The Load / Cargo Card */}
                    <motion.div 
                      className="bg-background border border-border rounded-xl p-5 mb-2 shadow-lg z-10 relative"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                      <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Carga Disponible</div>
                      <div className="font-bold text-foreground text-lg">24 Pallets - Refrigerado</div>
                      <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Santiago</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Valparaíso</span>
                      </div>
                    </motion.div>

                    {/* Connecting Line / Scanning Effect */}
                    <div className="flex-1 flex flex-col items-center justify-center relative my-2">
                      <div className="absolute w-px h-full bg-zinc-800/80"></div>
                      <motion.div 
                        className="absolute w-[2px] bg-green-500 shadow-[0_0_15px_#22c55e]"
                        initial={{ top: 0, height: 0, opacity: 0 }}
                        animate={{ top: ["0%", "50%", "100%"], height: ["0%", "50%", "0%"], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                      ></motion.div>
                      <div className="w-10 h-10 rounded-full bg-card border border-border z-10 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      </div>
                    </div>

                    {/* The Matched Truck Card */}
                    <motion.div 
                      className="bg-foreground/5 border border-border rounded-xl p-5 mt-2 shadow-lg z-10 relative overflow-hidden"
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: [0, 1, 1, 0], y: [30, 0, 0, 30], scale: [0.95, 1, 1, 0.95] }}
                      transition={{ repeat: Infinity, duration: 5, times: [0, 0.15, 0.85, 1], ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center border border-border shadow-inner">
                            <Truck className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-lg">Carlos R.</div>
                            <div className="text-xs text-foreground font-bold flex items-center gap-1 mt-0.5">
                              ✓ Operación Asignada
                            </div>
                          </div>
                        </div>
                        <div className="bg-primary text-primary-foreground font-extrabold text-sm px-3 py-1.5 rounded shadow-sm flex flex-col items-end">
                          $45.000 
                          <span className="text-[10px] font-medium opacity-70 line-through">Normal: $60.000</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <div className="bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1.5 rounded border border-border backdrop-blur-sm">Frigorífico</div>
                        <div className="bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1.5 rounded border border-border backdrop-blur-sm">A 5 km</div>
                        <div className="bg-muted text-foreground text-xs font-semibold px-2.5 py-1.5 rounded border border-border backdrop-blur-sm flex items-center gap-1">★ 4.9</div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2"
              >
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
                  Una plataforma. <br />Infinitas posibilidades.
                </h2>
                <p className="text-lg text-muted-foreground mb-10">
                  Coordinamos tus retiros portuarios y despachos de última milla de forma personalizada, centralizando toda la trazabilidad y auditoría para que mantengas el control absoluto de tus importaciones.
                </p>
 
                <div className="space-y-8">
                  {[
                    {
                      step: "01",
                      title: "Cotización personalizada",
                      desc: "Envíanos tus requerimientos de carga por correo o formulario y cotizamos con nuestro proveedor certificado."
                    },
                    {
                      step: "02",
                      title: "Despacho y Registro",
                      desc: "Creamos tu envío de forma manual en la plataforma y asignamos al cliente y al chofer al viaje."
                    },
                    {
                      step: "03",
                      title: "Monitoreo en Vivo",
                      desc: "Sigue la ubicación exacta del conductor en tiempo real en el mapa con reportes de entrega automáticos."
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center font-bold font-mono shadow-sm">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-foreground mb-2">{item.title}</h4>
                        <p className="text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Company Section */}
        <CompanySection />

        {/* Industries Section */}
        <IndustriesSection />

        {/* FAQ Section */}
        <FAQ />

        {/* Galactic CTA Section */}
        <GalacticCTA />
      </main>

      <Footer />

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/56912345678?text=Hola%20Vorian,%20necesito%20mover%20una%20carga..." 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg shadow-green-500/30 hover:scale-110 hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
      >
        {/* Ping Animation */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-50 animate-ping group-hover:animate-none"></span>
        <MessageCircle className="w-8 h-8 relative z-10" />
      </a>
    </div>
  );
}
