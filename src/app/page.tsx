"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Truck, ShieldCheck, Clock, Menu, X, BarChart3, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import VorianLogo from "@/assets/vorian_logo.png";
import { FAQ } from "@/components/faq";
import { GalacticCTA } from "@/components/galactic-cta";
import { Footer } from "@/components/footer";
import { CompanySection } from "@/components/company-section";
import { useTheme } from "next-themes";

import dynamic from 'next/dynamic';
const LandingMap = dynamic(() => import('@/components/landing-map').then(mod => mod.LandingMap), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-card animate-pulse"></div>
});

export default function LandingPage() {
  const { resolvedTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form states for sales contact request
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    role: "",
    volume: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al enviar el formulario.");
      }
      
      setFormSuccess(true);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        role: "",
        volume: "",
        message: ""
      });
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Error de conexión.");
    } finally {
      setFormLoading(false);
    }
  };

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
             <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-5 font-bold shadow-md transition-all hover:scale-105 active:scale-95 group flex items-center gap-2">
               <a href="#contacto" onClick={(e) => scrollTo(e, "contacto")}>
                 Hablar con ventas
                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </a>
             </Button>
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
                 <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-lg font-semibold">
                   <a href="#contacto" onClick={(e) => { scrollTo(e, "contacto"); setMobileMenuOpen(false); }}>
                     Hablar con ventas
                   </a>
                 </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="pt-24 md:pt-32 pb-16 relative">
        {/* Dynamic Background Glowing Orbs */}
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]"></div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 md:px-6 py-12 md:py-24 flex flex-col items-center text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground text-sm font-medium mb-8 border border-border/50"
          >
            <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-sm"></span>
            La evolución del transporte terrestre
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mb-6 leading-tight"
          >
            Logística <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-900 dark:from-zinc-400 dark:to-zinc-100">inteligente</span> para tu empresa
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
          >
            Conectamos cargas con transportistas de manera eficiente, segura y transparente.
            Gestiona tu flota o tus envíos desde una plataforma unificada.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/login">
              <Button className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-semibold bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all shadow-xl shadow-white/5">
                Crea tu cuenta gratis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#como-funciona">
              <Button variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-semibold border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                Conoce más
              </Button>
            </Link>
          </motion.div>

          {/* Realistic Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="w-full max-w-5xl mt-16 md:mt-24 relative"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
              {/* Box 1: Large (2 cols, 1 row) - Tracking */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
                className="md:col-span-2 bg-card rounded-[2rem] p-8 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 overflow-hidden relative group shadow-lg"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-zinc-500/20 transition-colors duration-500"></div>
                <div className="relative z-10 w-full h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-accent border border-border flex items-center justify-center text-foreground mb-4 backdrop-blur-sm">
                      <Map className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Rastreo en tiempo real</h3>
                    <p className="text-muted-foreground max-w-sm">Mantén el control total de tus envíos con actualizaciones precisas de ubicación y estado 24/7 en el mapa.</p>
                  </div>
                  
                  {/* Decorative element: Mini Map UI */}
                  <div className="absolute right-0 bottom-0 w-[60%] h-[75%] bg-card rounded-tl-2xl border-t border-l border-border translate-x-8 translate-y-8 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-500 hidden md:block overflow-hidden shadow-2xl">
                     {/* Fake Map Grid & Routes */}
                     <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--foreground) / 0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                     
                     {/* Route Line */}
                     <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                       <path d="M 40 140 Q 100 120 120 80 T 220 40" fill="transparent" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-foreground opacity-30" />
                     </svg>
                     
                     {/* Start Point */}
                     <div className="absolute left-[30px] top-[130px] w-4 h-4 bg-primary border-2 border-card rounded-full shadow-md z-10"></div>
                     
                     {/* Moving Truck / Current Location */}
                     <div className="absolute left-[110px] top-[70px] z-20">
                        <div className="w-12 h-12 bg-primary/10 rounded-full absolute -top-4 -left-4 animate-ping"></div>
                        <div className="w-4 h-4 bg-primary border-2 border-card rounded-full shadow-md relative z-10"></div>
                     </div>
                     
                     {/* Destination Point */}
                     <div className="absolute left-[210px] top-[30px] w-5 h-5 bg-muted border-2 border-card rounded-full shadow-md z-10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                     </div>
                     
                     {/* Floating ETA Card */}
                     <div className="absolute bottom-4 left-4 right-4 bg-muted/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-lg z-30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs">🚚</div>
                          <div>
                            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">En tránsito</div>
                            <div className="text-xs text-foreground font-bold truncate w-24">Patente XY-99</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">ETA</div>
                          <div className="text-xs text-foreground font-bold text-green-400">14:30</div>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>

              {/* Box 2: Tall (1 col, 2 rows) - Fleet Management */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="row-span-2 bg-gradient-to-b from-card to-muted/20 rounded-[2rem] p-8 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 overflow-hidden relative group shadow-lg flex flex-col"
              >
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-zinc-500/5 blur-[80px] group-hover:bg-zinc-500/10 transition-colors duration-500"></div>
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-accent border border-border flex items-center justify-center text-foreground mb-4 backdrop-blur-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Gestión ultra eficiente</h3>
                  <p className="text-muted-foreground mb-8">Digitaliza procesos, asigna cargas en segundos y mejora tus márgenes operativos con inteligencia artificial.</p>
                  
                  {/* Decorative element: Stats Bars */}
                  <div className="mt-auto flex flex-col gap-4">
                    {[
                      { label: "Tiempo de Asignación", width: "w-[15%]", color: "bg-primary" },
                      { label: "Costos Operativos", width: "w-[40%]", color: "bg-primary/60" },
                      { label: "Satisfacción", width: "w-[95%]", color: "bg-primary/80" },
                    ].map((stat, i) => (
                      <div key={i} className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
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

              {/* Box 3: Small (1 col, 1 row) - Smart Match */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card rounded-[2rem] p-8 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 relative group shadow-lg overflow-hidden flex flex-col"
              >
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Match Inteligente</h3>
                    <p className="text-muted-foreground text-sm">IA que conecta tu carga con el transportista ideal en milisegundos.</p>
                  </div>
                  
                  {/* Decorative Real UI element */}
                  <div className="mt-6 bg-card rounded-xl border border-border p-4 relative group-hover:-translate-y-1 transition-transform duration-500 shadow-inner">
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex -space-x-2">
                         <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-border flex items-center justify-center text-[10px] text-foreground z-10 shadow-sm">📦</div>
                         <div className="w-8 h-8 rounded-full bg-accent border-2 border-border flex items-center justify-center text-[10px] text-foreground z-0 shadow-sm">🚚</div>
                       </div>
                       <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 border border-border">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          99% Match
                       </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                       <motion.div 
                         className="bg-primary h-1.5 rounded-full"
                         initial={{ width: 0 }}
                         whileInView={{ width: "99%" }}
                         viewport={{ once: true }}
                         transition={{ duration: 1.5, delay: 0.8 }}
                       ></motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Box 4: Small (1 col, 1 row) - Analytics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-background rounded-[2rem] p-8 border border-border hover:border-border/80 hover:shadow-sm transition-all duration-300 relative group shadow-lg overflow-hidden flex flex-col"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-800/40 via-transparent to-transparent opacity-50"></div>
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Analítica Avanzada</h3>
                    <p className="text-muted-foreground text-sm">Visualiza el rendimiento logístico con reportes en tiempo real.</p>
                  </div>
                  
                  {/* Decorative Real UI element */}
                  <div className="mt-6 flex items-end gap-1.5 h-24 w-full opacity-80 group-hover:opacity-100 transition-opacity duration-500 pt-6">
                    {[40, 70, 45, 90, 65, 100, 80].map((height, i) => (
                      <div key={i} className="flex-1 rounded-t-sm relative group/bar flex flex-col justify-end h-full">
                        <motion.div 
                          className="w-full bg-zinc-800 group-hover/bar:bg-zinc-600 transition-colors rounded-t-sm"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${height}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.5 + (i * 0.1) }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-lg">
                            {height}%
                          </div>
                        </motion.div>
                      </div>
                    ))}
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
                      Buscando Transportista...
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
                      className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mt-2 shadow-[0_0_30px_rgba(34,197,94,0.15)] z-10 relative overflow-hidden"
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
                            <div className="text-xs text-green-400 font-bold flex items-center gap-1 mt-0.5">
                              ✓ Match Perfecto (99%)
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-500 text-black font-extrabold text-sm px-3 py-1.5 rounded shadow-sm">
                          $350.000
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="bg-black/50 text-muted-foreground text-xs font-semibold px-2.5 py-1.5 rounded border border-white/5 backdrop-blur-sm">Frigorífico</div>
                        <div className="bg-black/50 text-muted-foreground text-xs font-semibold px-2.5 py-1.5 rounded border border-white/5 backdrop-blur-sm">A 5 km</div>
                        <div className="bg-black/50 text-yellow-500 text-xs font-semibold px-2.5 py-1.5 rounded border border-yellow-500/20 backdrop-blur-sm flex items-center gap-1">★ 4.9</div>
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
                  Ya sea que necesites enviar carga o tengas camiones disponibles, Vorian Global centraliza toda la operación para que te enfoques en crecer tu negocio.
                </p>

                <div className="space-y-8">
                  {[
                    {
                      step: "01",
                      title: "Publica tu carga o disponibilidad",
                      desc: "Sube los detalles de tu requerimiento en segundos a través de una interfaz intuitiva."
                    },
                    {
                      step: "02",
                      title: "Match inteligente",
                      desc: "Nuestro sistema conecta automáticamente la carga con el transportista ideal según ruta y capacidad."
                    },
                    {
                      step: "03",
                      title: "Viaje monitoreado y pago seguro",
                      desc: "Sigue el trayecto en tiempo real y gestiona la documentación de entrega sin fricciones."
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-bold font-mono">
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



        {/* FAQ Section */}
        <FAQ />

        {/* Contact Section */}
        <section id="contacto" className="py-20 md:py-32 bg-background relative overflow-hidden border-t border-border">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="flex flex-col lg:flex-row gap-16 items-stretch">
              {/* Left Column: Text & Trust factors */}
              <div className="w-full lg:w-5/12 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-border text-primary text-xs font-semibold uppercase tracking-wider mb-6">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Ventas y Alianzas
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
                    Hablemos de tus desafíos logísticos
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Completa el formulario y un especialista se pondrá en contacto contigo en menos de 1 hora para presentarte una demo personalizada.
                  </p>
                </div>

                <div className="space-y-6 mt-8">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">💬</div>
                    <div>
                      <div className="font-bold text-foreground">Soporte Inmediato</div>
                      <div className="text-sm text-muted-foreground">info@vorianglobal.com</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">📍</div>
                    <div>
                      <div className="font-bold text-foreground">Oficina Principal</div>
                      <div className="text-sm text-muted-foreground">Santiago, Chile</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center font-bold">⚡</div>
                  <div>
                    <div className="font-bold text-foreground">Garantía de Respuesta</div>
                    <div className="text-sm text-muted-foreground">Respondemos en menos de 60 minutos</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Form */}
              <div className="w-full lg:w-7/12">
                <div className="bg-card border border-border rounded-[2rem] p-8 md:p-10 shadow-2xl relative">
                  {formSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-16 flex flex-col items-center justify-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce">
                        ✓
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-4">¡Solicitud Recibida!</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                        Hemos registrado tus datos correctamente. Uno de nuestros ejecutivos de cuentas te contactará en breve.
                      </p>
                      <Button onClick={() => setFormSuccess(false)} variant="outline" className="rounded-full px-6">
                        Enviar otro mensaje
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">Nombre Completo *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. Juan Pérez"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">Nombre de Empresa *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. Distribuidora del Sur"
                            value={formData.company}
                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">Email Corporativo *</label>
                          <input 
                            type="email" 
                            required
                            placeholder="juan@empresa.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">Teléfono de Contacto *</label>
                          <input 
                            type="tel" 
                            required
                            placeholder="+56 9 1234 5678"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">¿Cuál es tu rol? *</label>
                          <select 
                            required
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          >
                            <option value="">Selecciona una opción</option>
                            <option value="Generador de Carga / Cliente">Generador de Carga (Cliente)</option>
                            <option value="Transportista / Empresa Logística">Transportista (Flota)</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">Volumen de envíos mensuales *</label>
                          <select 
                            required
                            value={formData.volume}
                            onChange={(e) => setFormData({...formData, volume: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          >
                            <option value="">Selecciona una opción</option>
                            <option value="1 a 10 envíos">1 a 10 envíos / mes</option>
                            <option value="11 a 50 envíos">11 a 50 envíos / mes</option>
                            <option value="50+ envíos">Más de 50 envíos / mes</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Mensaje o comentarios adicionales</label>
                        <textarea 
                          rows={4}
                          placeholder="¿En qué podemos ayudarte?"
                          value={formData.message}
                          onChange={(e) => setFormData({...formData, message: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                        />
                      </div>

                      {formError && (
                        <div className="text-sm text-red-500 font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                          {formError}
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        disabled={formLoading}
                        className="w-full h-12 rounded-xl text-base font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        {formLoading ? (
                          <>
                            <span className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin"></span>
                            Procesando solicitud...
                          </>
                        ) : (
                          "Enviar Solicitud de Demo"
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Galactic CTA Section */}
        <GalacticCTA />
      </main>

      <Footer />
    </div>
  );
}
