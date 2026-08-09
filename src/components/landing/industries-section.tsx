"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Snowflake, Pickaxe, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const industries = [
  {
    id: "forwarders",
    title: "Agencias & Forwarders",
    icon: Pickaxe,
    description: "Conecta la llegada del buque o vuelo con el transporte terrestre. Mantén a tus clientes finales informados sobre cada hito aduanero y de última milla.",
    features: ["Retiro expedito en Puerto y Aeropuerto", "Gestión de contenedores FCL y carga LCL", "Trazabilidad compartida con cliente final"],
    color: "text-blue-500",
    bgLight: "bg-blue-500/10",
    bgBorder: "border-blue-500/20"
  },
  {
    id: "retail",
    title: "Retail e Importadores",
    icon: ShoppingBag,
    description: "Asegura el abastecimiento de tus bodegas. Monitorea contenedores de alto valor desde el puerto hasta tu centro de distribución con escoltas virtuales.",
    features: ["Control de tiempos de espera (Demurrage)", "Validación estricta de recepción con PIN", "Prevención de desvíos de ruta"],
    color: "text-orange-500",
    bgLight: "bg-orange-500/10",
    bgBorder: "border-orange-500/20"
  },
  {
    id: "frio",
    title: "Cadena de Frío (Reefer)",
    icon: Snowflake,
    description: "Exportación impecable de frutas y salmones. Asegura que tus contenedores Reefer mantengan la cadena de frío perfecta hasta su embarque.",
    features: ["Monitoreo de temperatura en tránsito", "Alertas automáticas de desconexión", "Prioridad en puerto (Stacking)"],
    color: "text-green-500",
    bgLight: "bg-green-500/10",
    bgBorder: "border-green-500/20"
  }
];

export function IndustriesSection() {
  const [activeTab, setActiveTab] = useState(industries[0]);

  return (
    <section className="py-20 md:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Construido para tu industria
          </h2>
          <p className="text-lg text-muted-foreground">
            No importa lo que muevas, nuestra plataforma se adapta a tus requerimientos operativos más exigentes.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
          {/* Tabs Menu */}
          <div className="w-full lg:w-1/3 flex flex-col gap-3">
            {industries.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setActiveTab(industry)}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left ${
                  activeTab.id === industry.id
                    ? `bg-card border-border shadow-lg scale-105`
                    : `bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground`
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${activeTab.id === industry.id ? industry.bgLight : 'bg-muted'}`}>
                  <industry.icon className={`w-6 h-6 ${activeTab.id === industry.id ? industry.color : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className={`font-bold ${activeTab.id === industry.id ? 'text-lg' : 'text-base'}`}>{industry.title}</h3>
                </div>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="w-full lg:w-2/3">
            <motion.div
              key={activeTab.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`bg-card rounded-[2rem] border ${activeTab.bgBorder} p-8 md:p-12 shadow-2xl relative overflow-hidden`}
            >
              {/* Background Glow */}
              <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-40 pointer-events-none ${activeTab.bgLight.replace('/10', '')}`} />
              
              <div className="relative z-10 flex flex-col gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${activeTab.bgLight} border ${activeTab.bgBorder}`}>
                  <activeTab.icon className={`w-8 h-8 ${activeTab.color}`} />
                </div>
                
                <h3 className="text-3xl font-bold text-foreground">{activeTab.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {activeTab.description}
                </p>

                <div className="mt-4 space-y-4">
                  {activeTab.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeTab.bgLight} ${activeTab.color}`}>✓</div>
                      <span className="font-medium text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-border">
                  <Button variant="outline" className="rounded-full px-6 h-12 hover:bg-foreground hover:text-background transition-all group">
                    Descubrir soluciones <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
