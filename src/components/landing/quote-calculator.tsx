"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Package, ArrowRight, CheckCircle2, Loader2, DollarSign, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/components/providers/supabase-provider";

export function QuoteCalculator() {
  const { supabase } = useSupabase();
  const [step, setStep] = useState<"form" | "result">("form");
  const [isLoading, setIsLoading] = useState(false);
  
  // State for form
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoType, setCargoType] = useState("");

  // Result state
  const [foundPrice, setFoundPrice] = useState<number | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !cargoType) return;
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("price")
        .eq("origin_id", origin)
        .eq("destination_id", destination)
        .eq("cargo_type", cargoType)
        .maybeSingle();

      if (data && data.price) {
        setFoundPrice(data.price);
      } else {
        setFoundPrice(null); // No direct route found
      }
    } catch (err) {
      console.error(err);
      setFoundPrice(null);
    } finally {
      setIsLoading(false);
      setStep("result");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative group">
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-card/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-6 overflow-hidden min-h-[280px] flex flex-col justify-center text-left">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.form 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleCalculate}
              className="flex flex-col gap-4"
            >
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
                Cotización Rápida
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <select 
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    required
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9 appearance-none relative"
                  >
                    <option value="" disabled>Punto de Origen</option>
                    <optgroup label="Puertos Marítimos">
                      <option value="san_antonio">Puerto San Antonio (STI/DP World)</option>
                      <option value="valparaiso">Puerto Valparaíso (TPS/TCVAL)</option>
                      <option value="iquique">Puerto Iquique</option>
                      <option value="san_vicente">Puerto San Vicente / Coronel</option>
                    </optgroup>
                    <optgroup label="Aeropuertos">
                      <option value="scl">Aeropuerto SCL (Arturo Merino Benítez)</option>
                    </optgroup>
                    <optgroup label="Instalaciones">
                      <option value="bodega_cliente">Bodega / Centro de Distribución</option>
                    </optgroup>
                  </select>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <select 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9 appearance-none relative"
                  >
                    <option value="" disabled>Punto de Destino</option>
                    <optgroup label="Instalaciones">
                      <option value="rm_santiago">Región Metropolitana (Santiago)</option>
                      <option value="norte">Zona Norte de Chile</option>
                      <option value="sur">Zona Sur de Chile</option>
                    </optgroup>
                    <optgroup label="Puertos y Aeropuertos (Exportación)">
                      <option value="san_antonio">Puerto San Antonio</option>
                      <option value="valparaiso">Puerto Valparaíso</option>
                      <option value="scl">Aeropuerto SCL</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select 
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value)}
                  required
                  className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9 appearance-none"
                >
                  <option value="" disabled>Tipo de Carga</option>
                  <option value="fcl_20">Contenedor 20' (FCL)</option>
                  <option value="fcl_40">Contenedor 40' / 40' HC (FCL)</option>
                  <option value="fcl_reefer">Contenedor Reefer (Refrigerado)</option>
                  <option value="lcl">Carga Suelta (LCL / Consolidado)</option>
                  <option value="air">Carga Aérea</option>
                  <option value="peligrosa">Carga Peligrosa (IMO)</option>
                  <option value="sobredimensionada">Carga Sobredimensionada</option>
                </select>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full mt-2 h-11 text-base group">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Calcular Tarifa <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </motion.form>
          )}

          {step === "result" && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center gap-4 text-center h-full py-4"
            >
              {foundPrice !== null ? (
                <>
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Tarifa Estimada</h3>
                  <p className="text-4xl font-black text-primary my-2">
                    ${foundPrice.toLocaleString("es-CL")} <span className="text-sm text-muted-foreground font-normal">CLP</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tarifa referencial para el servicio de transporte seleccionado. Sujeto a disponibilidad de flota.
                  </p>
                  <Button className="w-full mt-2 h-11">
                    Reservar Servicio
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-2">
                    <Headset className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Ruta Especial</h3>
                  <p className="text-sm text-muted-foreground">
                    Esta ruta requiere análisis operativo y permisos especiales. Un ejecutivo de cuentas clave preparará una propuesta a medida.
                  </p>
                  <Button className="w-full mt-2 h-11">
                    Contactar a Ventas
                  </Button>
                </>
              )}
              
              <button type="button" onClick={() => setStep("form")} className="text-xs text-muted-foreground hover:text-foreground mt-2 underline underline-offset-4">
                Hacer otra cotización
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
