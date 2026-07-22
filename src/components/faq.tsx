"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "¿Cómo validan a los transportistas de la red?",
    answer: "Todos los transportistas de Vorian Global pasan por un riguroso proceso de validación. Verificamos su identidad, antecedentes legales, estado del vehículo (revisión técnica, seguros) y realizamos entrevistas. Solo aceptamos a los mejores."
  },
  {
    question: "¿Qué tipo de camiones están disponibles?",
    answer: "Nuestra red abarca desde furgones pequeños para última milla hasta camiones articulados, ramplas, frigoríficos, camas bajas y camiones tolva. Nos adaptamos a cualquier tipo de carga que necesites mover."
  },
  {
    question: "¿Tengo que pagar para registrarme?",
    answer: "No. El registro en la plataforma es 100% gratuito tanto para generadores de carga como para transportistas. Vorian cobra un pequeño fee transaccional solo cuando el viaje se completa de manera exitosa."
  },
  {
    question: "¿Cómo funciona el rastreo en tiempo real?",
    answer: "Usamos la tecnología GPS del dispositivo móvil del transportista, integrado en nuestra App exclusiva. Podrás ver la ubicación exacta de tu carga en un mapa interactivo en tu dashboard las 24 horas del día."
  },
  {
    question: "¿Qué pasa si hay un problema durante el viaje?",
    answer: "Contamos con un equipo de soporte 24/7. Además, todas las cargas de alto valor pueden ser aseguradas a través de nuestras alianzas con aseguradoras líderes en el mercado, directo desde la plataforma."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row gap-16 lg:gap-24">
          <div className="w-full md:w-1/3">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Preguntas Frecuentes
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Todo lo que necesitas saber sobre cómo Vorian Global transforma tu logística.
            </p>
            <div className="hidden md:block w-24 h-1 bg-zinc-500 rounded-full"></div>
          </div>

          <div className="w-full md:w-2/3 space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="bg-card border border-border rounded-2xl overflow-hidden transition-colors hover:border-border/80 hover:shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full text-left px-6 py-6 flex justify-between items-center focus:outline-none"
                >
                  <span className="text-foreground font-bold text-lg pr-8">{faq.question}</span>
                  <ChevronDown 
                    className={`w-6 h-6 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${openIndex === i ? "rotate-180" : ""}`} 
                  />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-muted-foreground leading-relaxed border-t border-border/50 mt-2 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
