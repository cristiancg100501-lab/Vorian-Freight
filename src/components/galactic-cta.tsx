"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GalacticCTA() {
  return (
    <section className="relative py-32 overflow-hidden bg-[#0a0a0a]">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zinc-500/10 rounded-full blur-[120px]"></div>
        
        {/* Animated grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`, 
            backgroundSize: '40px 40px' 
          }}
        ></div>

        {/* Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full shadow-[0_0_15px_#ffffff] animate-ping"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-white rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-zinc-500/50 rounded-full blur-sm"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-zinc-500/30 bg-zinc-500/10 backdrop-blur-md">
            <span className="text-zinc-300 text-sm font-bold tracking-wider uppercase">El futuro es ahora</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
            ¿Listo para transformar <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              tu logística?
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            Únete a la red de transporte más avanzada. Regístrate gratis en menos de 2 minutos.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <Link href="/login">
              <Button className="h-16 px-10 rounded-full text-lg font-bold bg-white hover:bg-zinc-200 text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all hover:scale-105">
                Comenzar ahora
              </Button>
            </Link>
            <Link href="#contacto">
              <Button variant="outline" className="h-16 px-10 rounded-full text-lg font-bold border-zinc-700 hover:bg-zinc-800 text-white transition-all">
                Contactar Ventas
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
