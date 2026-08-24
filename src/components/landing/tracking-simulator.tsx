"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, MapPin, Truck, CheckCircle2, ShieldCheck, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingMap } from "../landing-map";

export function TrackingSimulator() {
  const [trackingId, setTrackingId] = useState("VOR-2026");
  const [simulating, setSimulating] = useState(false);
  const [step, setStep] = useState(0); // 0: input, 1-4: steps

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    
    setSimulating(true);
    setStep(1);
    
    setTimeout(() => setStep(2), 2500);
    setTimeout(() => setStep(3), 5500);
    // step 4 is triggered by onComplete in LandingMap
  };

  const steps = [
    { icon: <Box className="w-5 h-5" />, title: "Carga Liberada", desc: "Puerto de San Antonio", time: "08:30" },
    { icon: <Truck className="w-5 h-5" />, title: "En Tránsito", desc: "Ruta 78 - Km 45", time: "10:15" },
    { icon: <MapPin className="w-5 h-5" />, title: "Llegando a CD", desc: "Bodega Pudahuel", time: "ETA 12:45" },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: "Entregado", desc: "Recepción por PIN", time: "--:--" }
  ];

  return (
    <section className="w-full py-20 bg-muted/30 border-b border-border relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl tracking-tight text-foreground mb-4">
              <span className="font-medium text-foreground/80">Prueba la</span> <span className="font-black">trazabilidad en vivo</span>
            </h2>
            <p className="text-muted-foreground">Ingresa un código de seguimiento de prueba (ej. VOR-2026) para ver cómo informamos a tus clientes.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`mx-auto transition-all duration-500 ${simulating ? 'max-w-5xl' : 'max-w-xl'}`}
          >
            <AnimatePresence mode="wait">
              {!simulating ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="bg-card border border-border rounded-[2rem] p-6 md:p-10 shadow-xl"
                >
                  <form onSubmit={handleSimulate} className="flex flex-col gap-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <input
                        type="text"
                        value={trackingId}
                        readOnly
                        className="block w-full pl-11 pr-4 py-4 bg-background/50 border border-border rounded-xl text-foreground focus:outline-none text-lg font-mono uppercase transition-all shadow-inner cursor-default opacity-80"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-14 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
                      Rastrear Carga
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                  className="bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
                >
                  {/* Fake Browser/App Header */}
                  <div className="h-12 border-b border-border bg-muted/50 flex items-center px-4 relative">
                    <div className="flex gap-2 z-10">
                      <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/20"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/20"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/20"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-background/80 border border-border px-4 py-1 rounded-md flex items-center gap-2 shadow-sm">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs font-mono text-muted-foreground tracking-tight">app.vorian.global/tracking/{trackingId || "VOR-2026"}</span>
                      </div>
                    </div>
                    <div className="ml-auto z-10 flex gap-2">
                       <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => { setSimulating(false); setStep(0); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                       </Button>
                    </div>
                  </div>
                  
                  {/* Real App UI Body */}
                  <div className="flex flex-col md:flex-row h-[500px]">
                    {/* Left Sidebar (Timeline) */}
                    <div className="w-full md:w-80 bg-card border-r border-border p-6 flex flex-col overflow-y-auto">
                      <div className="mb-6">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Estado del Viaje</div>
                        <div className="text-2xl font-black text-foreground font-quicksand">En Progreso</div>
                      </div>
                      
                      <div className="relative flex-1 px-2 mt-4">
                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border rounded-full"></div>
                        <div className="flex flex-col gap-8 relative">
                          {steps.map((s, idx) => {
                            const isActive = step >= idx + 1;
                            const isCurrent = step === idx + 1;
                            const isLast = idx === steps.length - 1;
                            const isDone = step > idx + 1 || (isLast && isActive);
                            
                            return (
                              <div key={idx} className={`flex gap-4 items-start transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center bg-background shrink-0 transition-colors duration-500 z-10
                                  ${isActive ? 'border-foreground text-foreground' : 'border-border text-muted-foreground'}
                                  ${isCurrent ? 'shadow-[0_0_10px_rgba(var(--foreground),0.2)] ring-2 ring-foreground/10' : ''}
                                  ${isDone && !isCurrent ? 'bg-foreground text-background border-foreground' : ''}
                                `}>
                                  <div className="scale-75">{s.icon}</div>
                                  {isCurrent && !isLast && (
                                    <motion.div 
                                      className="absolute inset-0 rounded-full bg-foreground"
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: [0, 0.2, 0], scale: [0.8, 1.5, 2] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                  )}
                                </div>
                                <div className="flex-1 pt-1">
                                  <div className={`font-bold text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{s.title}</div>
                                  <div className="text-xs text-muted-foreground mb-1">{s.desc}</div>
                                  <div className="font-mono text-[10px] text-muted-foreground">{s.time}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side (Map + Floating UI) */}
                    <div className="flex-1 relative bg-muted/20">
                      <LandingMap 
                        className="absolute inset-0 w-full h-full opacity-90" 
                        onComplete={() => setStep(4)}
                      />
                      
                      {/* Floating Info Card */}
                      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-lg">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Carga Monitorizada</div>
                        <div className="font-mono font-bold text-xl text-foreground mb-2 flex items-center gap-2">
                          <Box className="w-5 h-5 text-foreground/70" />
                          {trackingId || "VOR-2026"}
                        </div>
                        <div className="flex gap-4 text-xs font-medium">
                           <div>
                             <div className="text-muted-foreground">Origen</div>
                             <div className="text-foreground">San Antonio</div>
                           </div>
                           <div className="w-px bg-border"></div>
                           <div>
                             <div className="text-muted-foreground">Destino</div>
                             <div className="text-foreground">Santiago CD</div>
                           </div>
                        </div>
                      </div>

                      {/* Security Badge */}
                      <div className="absolute bottom-4 right-4 bg-foreground text-background px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-10">
                        <ShieldCheck className="w-4 h-4 text-background" />
                        <span className="text-xs font-bold tracking-wide">Telemetría Encriptada</span>
                      </div>

                      {/* PIN Animation Overlay on step 4 */}
                      <AnimatePresence>
                        {step === 4 && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[2px]"
                          >
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ type: "spring", bounce: 0.5 }}
                              className="bg-card border border-border p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 w-64"
                            >
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Firma Digital <br/>Recepción en Bodega</div>
                              
                              <div className="flex gap-2 w-full justify-center mt-2">
                                {[4, 8, 2, 7].map((num, i) => (
                                  <motion.div 
                                    key={i}
                                    className="w-10 h-12 rounded-xl border-2 border-border bg-background flex items-center justify-center font-mono text-xl font-black text-foreground shadow-inner"
                                  >
                                    <motion.span 
                                      initial={{ opacity: 0, scale: 0.5 }} 
                                      animate={{ opacity: 1, scale: 1 }} 
                                      transition={{ delay: 0.5 + (i * 0.3), type: "spring" }}
                                    >
                                      {num}
                                    </motion.span>
                                  </motion.div>
                                ))}
                              </div>
                              
                              <div className="relative w-full h-10 mt-2 rounded-lg overflow-hidden">
                                <motion.div 
                                  initial={{ opacity: 1 }}
                                  animate={{ opacity: 0 }}
                                  transition={{ delay: 1.8, duration: 0.2 }}
                                  className="absolute inset-0 bg-muted text-foreground flex items-center justify-center text-xs font-bold uppercase tracking-wider border border-border rounded-lg"
                                >
                                  Validando...
                                </motion.div>
                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }} 
                                  animate={{ opacity: 1, y: 0 }} 
                                  transition={{ delay: 1.9, type: "spring" }}
                                  className="absolute inset-0 bg-emerald-500 text-white flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider shadow-lg rounded-lg"
                                >
                                  <ShieldCheck className="w-4 h-4" /> Entregado
                                </motion.div>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
