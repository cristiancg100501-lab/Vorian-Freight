"use client";

import { motion } from "framer-motion";
import { MapPin, Rocket, Users, Target } from "lucide-react";

export function CompanySection() {
  const stats = [
    { label: "Visibilidad de Cargas", value: "100%", icon: Target, color: "text-white", bg: "bg-white/10" },
    { label: "Disponibilidad", value: "24/7", icon: Users, color: "text-zinc-300", bg: "bg-zinc-500/10" },
    { label: "Cobertura de Regiones", value: "16", icon: MapPin, color: "text-zinc-400", bg: "bg-zinc-600/10" },
    { label: "Ahorro de Tiempo", value: "30%", icon: Rocket, color: "text-zinc-100", bg: "bg-zinc-400/20" }
  ];

  return (
    <section id="compania" className="py-24 md:py-32 bg-[#121212] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-1/2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              Nuestra Compañía
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
              Diseñando el futuro <br/><span className="text-zinc-500">del transporte en Chile.</span>
            </h2>
            <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
              En Vorian Global, creemos que la logística nacional no debería ser un dolor de cabeza. Nacimos con la misión de eliminar la fricción entre quienes necesitan enviar carga y quienes tienen el transporte para moverla a lo largo de todo Chile.
            </p>
            <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
              Al combinar tecnología, analítica en tiempo real y un diseño centrado en las personas, estamos construyendo la red logística con más potencial y mayor crecimiento del país.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="flex -space-x-4">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-[#121212] bg-zinc-800 flex items-center justify-center overflow-hidden relative">
                    {/* Using div placeholders instead of images to avoid 404s/external image issues */}
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-400">
                      V{i}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-zinc-400">
                <strong className="text-white">Un equipo 100% local</strong><br/>
                apasionado por resolver la logística chilena.
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full lg:w-1/2"
          >
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + (idx * 0.1) }}
                    className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6 md:p-8 hover:bg-[#222] transition-colors group relative overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-2xl -translate-y-1/2 translate-x-1/2 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 relative z-10`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="relative z-10">
                      <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                      <div className="text-sm text-zinc-400 font-medium">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
