"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Send, CheckCircle2, MessageSquare, Phone, Mail, Building, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import VorianLogo from "@/assets/vorian_logo.png";
import { useTheme } from "next-themes";

export default function ContactSalesPage() {
  const { resolvedTheme } = useTheme();
  
  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    rut: "",
    giro: "",
    profile: "Cliente", // Default select
    volume: "100", // Default range slider middle value
    message: ""
  });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      volume: e.target.value
    });
  };

  const getVolumeLabel = (val: string) => {
    const num = parseInt(val, 10);
    if (num >= 500) {
      return "Más de 500 envíos mensuales";
    }
    return `${num} envíos mensuales`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      // Map 'profile' to 'role' internally if backend still expects role, or send both.
      // We will send 'role' and 'profile' for max API compatibility!
      const payload = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        rut: formData.rut,
        giro: formData.giro,
        profile: formData.profile,
        role: formData.profile, // fallback mapping
        volume: getVolumeLabel(formData.volume),
        message: formData.message
      };

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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
        rut: "",
        giro: "",
        profile: "Cliente",
        volume: "100",
        message: ""
      });
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Error de conexión.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans relative flex flex-col justify-between overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background Glowing Orbs */}
      <div className="absolute top-0 left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-50">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src={VorianLogo} 
            alt="Vorian Global Logo" 
            width={130} 
            height={36} 
            className="object-contain dark:invert-0 invert"
          />
        </Link>
        <Link href="/">
          <Button variant="ghost" className="rounded-full flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Button>
        </Link>
      </header>

      {/* Main content body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 md:py-16 relative z-10 flex flex-col lg:flex-row gap-16 items-stretch justify-center">
        {/* Left Column: Trust signals and information */}
        <div className="w-full lg:w-5/12 flex flex-col justify-between py-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-border text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Demo e Integración
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              Lleva tu logística al siguiente nivel
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Completa el formulario para agendar una sesión personalizada con uno de nuestros asesores técnicos. Analizaremos tu operación y te mostraremos cómo reducir costos y tiempos de asignación en tiempo real.
            </p>
          </div>

          <div className="space-y-6 mt-12 lg:mt-0">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">💬</div>
              <div>
                <div className="font-bold text-foreground">Soporte Inmediato</div>
                <div className="text-sm text-muted-foreground">info@vorianglobal.com</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">📍</div>
              <div>
                <div className="font-bold text-foreground">Oficinas Comerciales</div>
                <div className="text-sm text-muted-foreground">Santiago, Chile</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center font-bold text-green-500">⚡</div>
              <div>
                <div className="font-bold text-foreground">Garantía de Respuesta</div>
                <div className="text-sm text-muted-foreground">Te contactamos en menos de 60 minutos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Responsive Sales Contact Form */}
        <div className="w-full lg:w-7/12 flex items-center">
          <div className="w-full bg-card border border-border rounded-[2rem] p-8 md:p-10 shadow-2xl relative">
            {formSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 flex flex-col items-center justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">¡Solicitud Registrada!</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                  Hemos recibido tu solicitud. Nuestro equipo de cuentas te contactará a la brevedad para coordinar la demo.
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
                      placeholder="Juan Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nombre de Empresa *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Distribuidora Limitada"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">RUT de la Empresa *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="76.123.456-K"
                      value={formData.rut}
                      onChange={(e) => setFormData({...formData, rut: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Giro de la Empresa *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Transporte / Comercio / Manufactura"
                      value={formData.giro}
                      onChange={(e) => setFormData({...formData, giro: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shadow-sm"
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
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shadow-sm"
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
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">¿Cuál es tu perfil? *</label>
                  <select 
                    required
                    value={formData.profile}
                    onChange={(e) => setFormData({...formData, profile: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shadow-sm"
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Transportista">Transportista</option>
                  </select>
                </div>

                {/* Range Slider for shipments volume */}
                <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-foreground">Cantidad de envíos aprox. *</label>
                    <span className="text-xs font-extrabold bg-primary/10 text-primary border border-border px-2 py-0.5 rounded-full">
                      {getVolumeLabel(formData.volume)}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="500" 
                    step="5"
                    value={formData.volume}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-muted dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-semibold uppercase">
                    <span>1 envío</span>
                    <span>250 envíos</span>
                    <span>500+ envíos</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Mensaje o comentarios adicionales</label>
                  <textarea 
                    rows={3}
                    placeholder="Cuéntanos más sobre tus necesidades..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none shadow-sm"
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
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Solicitud de Ventas
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card/30 backdrop-blur-md py-6 text-center text-xs text-muted-foreground relative z-50">
        <p>© {new Date().getFullYear()} Vorian Global. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
