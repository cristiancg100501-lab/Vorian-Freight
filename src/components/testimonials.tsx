"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    name: "Carlos R.",
    role: "Transportista Independiente",
    text: "Desde que uso Vorian, mi camión nunca vuelve vacío. Mis ingresos aumentaron un 30% en el primer mes y me pagan a tiempo.",
    avatar: "https://i.pravatar.cc/150?u=carlos"
  },
  {
    name: "María F.",
    role: "Gerente de Logística, ExportCargo",
    text: "La visibilidad que da la plataforma es increíble. Ya no tengo que llamar 10 veces para saber dónde está mi carga. Todo en un solo dashboard.",
    avatar: "https://i.pravatar.cc/150?u=maria"
  },
  {
    name: "Roberto V.",
    role: "Dueño de Flota",
    text: "Asignar cargas a mis 15 choferes solía ser una pesadilla. Ahora la plataforma hace el match automáticamente y me olvido del papeleo.",
    avatar: "https://i.pravatar.cc/150?u=roberto"
  },
  {
    name: "Andrea S.",
    role: "Operaciones B2B",
    text: "La integración es impecable. Validar a los transportistas era un proceso lento, con la Red Certificada de Vorian dormimos tranquilos.",
    avatar: "https://i.pravatar.cc/150?u=andrea"
  }
];

export function Testimonials() {
  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 mb-12 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
          Confían en Vorian
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Cientos de generadores de carga y transportistas ya están transformando su forma de operar.
        </p>
      </div>

      <div className="relative flex overflow-hidden">
        {/* Gradients to fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10"></div>

        <motion.div
          animate={{ x: [0, -1035] }}
          transition={{ ease: "linear", duration: 20, repeat: Infinity }}
          className="flex gap-6 whitespace-nowrap px-4"
        >
          {/* Double array to create infinite scroll effect */}
          {[...testimonials, ...testimonials].map((t, i) => (
            <div 
              key={i} 
              className="w-[350px] md:w-[400px] flex-shrink-0 bg-card border border-border rounded-3xl p-8 hover:border-border/80 hover:shadow-sm transition-colors"
            >
              <div className="flex gap-1 mb-6 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <p className="text-foreground text-lg mb-8 whitespace-normal leading-relaxed">
                "{t.text}"
              </p>
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                  <Image src={t.avatar} alt={t.name} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="text-foreground font-bold">{t.name}</h4>
                  <p className="text-muted-foreground text-sm">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
